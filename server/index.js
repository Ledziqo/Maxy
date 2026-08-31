import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import mysql from 'mysql2/promise'
import { PDFDocument } from 'pdf-lib'

const app = express()
const port = Number(process.env.PORT || 3001)
const missingProductionConfig = ['DATABASE_URL','SESSION_SECRET'].filter(key => !process.env[key])
if (process.env.NODE_ENV === 'production' && missingProductionConfig.length) throw new Error(`Missing production configuration: ${missingProductionConfig.join(', ')}`)
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'private-uploads')
const paymentQrDir = path.resolve(process.env.PAYMENT_QR_DIR || 'public-payment-qr')
const facilityAddress = 'Gabon Street Woreda 02, House no. 359, Addis Ababa, Ethiopia'
const facilityCoordinates = { lat: 9.0320, lng: 38.7469 }
fs.mkdirSync(uploadDir, { recursive: true })
fs.mkdirSync(paymentQrDir, { recursive: true })
const pool = mysql.createPool({ uri: process.env.DATABASE_URL, waitForConnections: true, connectionLimit: 10 })
const upload = multer({ dest: uploadDir, limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^(image|application\/pdf)/.test(file.mimetype)) })
const qrUpload = multer({ dest: paymentQrDir, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^image\/(png|jpeg|webp)$/.test(file.mimetype)) })

app.use(helmet({ crossOriginResourcePolicy: false }))
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'https://maxrez.cc,http://localhost:5173,http://localhost:3001').split(',').map(x => x.trim()).filter(Boolean)
app.use(cors({ origin: (origin, callback) => !origin || allowedOrigins.includes(origin) ? callback(null, true) : callback(new Error('Origin not allowed')) }))
app.use(express.json({ limit: '3mb' }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 400 }))
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false })
const uploadLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false })

const publicOrderId = () => `MXZ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
const trackingToken = () => crypto.randomBytes(30).toString('base64url')
const tokenFor = (user, kind = 'staff') => jwt.sign({ id: user.id, role: user.role, name: user.name, kind }, process.env.SESSION_SECRET, { expiresIn: kind === 'customer' ? '30d' : '12h' })
function auth(req, res, next) { try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.SESSION_SECRET); next() } catch { res.status(401).json({ error: 'Authentication required' }) } }
function roles(...allowed) { return (req, res, next) => req.user.kind !== 'customer' && allowed.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' }) }
function customerAuth(req, res, next) { return auth(req, res, () => req.user.kind === 'customer' ? next() : res.status(403).json({ error: 'Customer account required' })) }
async function event(orderId, actorId, status, note = '') { await pool.query('INSERT INTO order_events (order_id, actor_id, status, note) VALUES (?, ?, ?, ?)', [orderId, actorId || null, status, note]) }
const normalizeEmail = value => String(value || '').trim().toLowerCase()
const orderStatuses = ['new', 'confirmed', 'paid', 'out_for_delivery', 'completed', 'cancelled']
const paymentStatuses = ['unpaid', 'submitted', 'verified', 'rejected']
function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) ? n : null }
function distanceKm(a, b) { const radians = value => value * Math.PI / 180; const dLat = radians(b.lat - a.lat); const dLng = radians(b.lng - a.lng); const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) }

const defaultRules = {
  sizes: [{ value: 'A5', label: 'A5', multiplier: .8 }, { value: 'A4', label: 'A4', multiplier: 1 }, { value: 'A3', label: 'A3', multiplier: 1.65 }],
  materials: [{ value: 'standard', label: 'Standard stock', multiplier: 1 }, { value: 'premium', label: 'Premium stock', multiplier: 1.35 }, { value: 'luxury', label: 'Luxury stock', multiplier: 1.8 }],
  sides: [{ value: 'single', label: 'Single-sided', multiplier: 1 }, { value: 'double', label: 'Double-sided', multiplier: 1.35 }],
  finishes: [{ value: 'none', label: 'No finishing', multiplier: 1 }, { value: 'matte', label: 'Matte lamination', multiplier: 1.2 }, { value: 'gloss', label: 'Gloss lamination', multiplier: 1.18 }, { value: 'foil', label: 'Foil / specialty finish', multiplier: 1.65 }],
  quantityTiers: [{ min: 1, multiplier: 1 }, { min: 100, multiplier: .88 }, { min: 500, multiplier: .72 }, { min: 1000, multiplier: .62 }],
  designFee: 900,
  urgentMultiplier: 1.25
}
const productSeeds = [
  ['business-cards','Business Cards','Cards & stationery',4.5,50],['brochures','Brochures & Flyers','Marketing print',8,25],['labels','Labels & Stickers','Labels',3.5,50],['books','Books & Catalogues','Publishing',65,10],['packaging','Boxes & Packaging','Packaging',35,25],['restaurant-print','Restaurant Print Pack','Industry bundles',28,25],['large-format','Banners & Large Format','Large format',180,1],['custom','Custom Print Project','Custom',1,1]
]

async function ensureSchema() {
  const schema = fs.readFileSync(path.resolve('server/schema.sql'), 'utf8')
  for (const statement of schema.split(';').map(s => s.trim()).filter(Boolean)) await pool.query(statement)
  const migrations = [
    "UPDATE orders SET status=CASE status WHEN 'quoted' THEN 'confirmed' WHEN 'awaiting_payment' THEN 'confirmed' WHEN 'payment_verification' THEN 'confirmed' WHEN 'payment_confirmed' THEN 'paid' WHEN 'design_review' THEN 'confirmed' WHEN 'approved' THEN 'confirmed' WHEN 'printing' THEN 'paid' WHEN 'finishing' THEN 'paid' WHEN 'quality_check' THEN 'paid' WHEN 'ready' THEN 'paid' WHEN 'dispatched' THEN 'out_for_delivery' WHEN 'delivered' THEN 'completed' ELSE status END WHERE status NOT IN ('new','confirmed','paid','out_for_delivery','completed','cancelled')",
    "ALTER TABLE orders MODIFY COLUMN status ENUM('new','confirmed','paid','out_for_delivery','completed','cancelled') NOT NULL DEFAULT 'new'",
    'ALTER TABLE payment_methods ADD COLUMN qr_url VARCHAR(500) NULL',
    'ALTER TABLE orders ADD COLUMN tracking_token VARCHAR(96) NULL UNIQUE AFTER public_id',
    'ALTER TABLE orders ADD COLUMN customer_id INT NULL AFTER tracking_token',
    'ALTER TABLE orders ADD COLUMN product_id INT NULL AFTER customer_id',
    'ALTER TABLE orders ADD COLUMN pricing_breakdown JSON NULL AFTER details',
    'ALTER TABLE orders ADD COLUMN artwork_validation JSON NULL AFTER pricing_breakdown',
    'ALTER TABLE orders ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER artwork_validation',
    'ALTER TABLE orders ADD COLUMN unit_price DECIMAL(12,2) DEFAULT 0 AFTER quantity',
    "ALTER TABLE orders ADD COLUMN fulfillment_method ENUM('pickup','delivery') NOT NULL DEFAULT 'pickup' AFTER urgent",
    'ALTER TABLE orders ADD COLUMN destination_lat DECIMAL(10,7) NULL AFTER delivery_zone',
    'ALTER TABLE orders ADD COLUMN destination_lng DECIMAL(10,7) NULL AFTER destination_lat',
    'ALTER TABLE orders ADD COLUMN delivery_distance_meters INT NULL AFTER destination_lng',
    'ALTER TABLE orders ADD COLUMN delivery_duration_seconds INT NULL AFTER delivery_distance_meters',
    "ALTER TABLE orders ADD COLUMN payment_status ENUM('unpaid','submitted','verified','rejected') NOT NULL DEFAULT 'unpaid' AFTER status",
    'ALTER TABLE orders ADD COLUMN payment_method VARCHAR(80) NULL AFTER payment_status',
    'ALTER TABLE orders ADD COLUMN payment_note TEXT NULL AFTER payment_method',
    'ALTER TABLE orders ADD COLUMN payment_verified_by INT NULL AFTER payment_note',
    'ALTER TABLE orders ADD COLUMN payment_verified_at DATETIME NULL AFTER payment_verified_by',
    'ALTER TABLE order_files ADD COLUMN validation_report JSON NULL AFTER size_bytes'
  ]
  for (const sql of migrations) { try { await pool.query(sql) } catch (error) { if (!/Duplicate column|already exists|Duplicate key/i.test(error.message)) console.warn(error.message) } }
  await pool.query('CREATE TABLE IF NOT EXISTS delivery_zones (id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL,radius_km DECIMAL(8,2) NOT NULL,fee DECIMAL(12,2) NOT NULL DEFAULT 0,eta_minutes INT NOT NULL DEFAULT 60,center_lat DECIMAL(10,7),center_lng DECIMAL(10,7),active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)').catch(() => {})
  for (const sql of ['ALTER TABLE delivery_zones ADD COLUMN center_lat DECIMAL(10,7) NULL', 'ALTER TABLE delivery_zones ADD COLUMN center_lng DECIMAL(10,7) NULL']) { try { await pool.query(sql) } catch (error) { if (!/Duplicate column|already exists/i.test(error.message)) console.warn(error.message) } }
  const [untracked] = await pool.query('SELECT id FROM orders WHERE tracking_token IS NULL').catch(() => [[]])
  for (const order of untracked) await pool.query('UPDATE orders SET tracking_token=? WHERE id=?', [trackingToken(),order.id])
  const [count] = await pool.query('SELECT COUNT(*) count FROM product_catalog')
  if (!Number(count[0].count)) for (let i = 0; i < productSeeds.length; i++) { const [slug,name,category,base,min] = productSeeds[i]; await pool.query('INSERT INTO product_catalog (slug,name,description,category,base_price,minimum_quantity,pricing_rules,sort_order) VALUES (?,?,?,?,?,?,?,?)', [slug,name,`Configure ${name.toLowerCase()} and receive an instant estimate.`,category,base,min,JSON.stringify(defaultRules),i]) }
  for (const [name, sort] of [['Telebirr',0],['CBE Birr',1],['Awash Bank',2]]) { const [rows]=await pool.query('SELECT id FROM payment_methods WHERE LOWER(name)=LOWER(?) LIMIT 1',[name]); if(!rows[0]) await pool.query('INSERT INTO payment_methods (name,instructions,account_label,sort_order) VALUES (?, ?, ?, ?)',[name,'Send the payment receipt with your order number.','',sort]) }
}

function parseJson(value, fallback = {}) { if (!value) return fallback; if (typeof value === 'object') return value; try { return JSON.parse(value) } catch { return fallback } }
function calculateQuote(product, input = {}) {
  const rules = parseJson(product.pricing_rules, defaultRules)
  const quantity = Math.max(Number(product.minimum_quantity || 1), Number(input.quantity || 1))
  const pick = (key, value) => (rules[key] || []).find(x => x.value === value)?.multiplier || 1
  const tier = [...(rules.quantityTiers || [])].sort((a,b) => b.min-a.min).find(x => quantity >= x.min)?.multiplier || 1
  const multiplier = pick('sizes',input.size) * pick('materials',input.material) * pick('sides',input.sides) * pick('finishes',input.finish) * tier
  const unitPrice = Number(product.base_price) * multiplier
  const production = unitPrice * quantity
  const designFee = input.designHelp ? Number(rules.designFee || 0) : 0
  const urgentFee = input.urgent ? production * (Number(rules.urgentMultiplier || 1.25) - 1) : 0
  return { quantity, unitPrice: Number(unitPrice.toFixed(2)), production: Number(production.toFixed(2)), designFee, urgentFee: Number(urgentFee.toFixed(2)), subtotal: Number((production + designFee + urgentFee).toFixed(2)), selections: input }
}

async function validateArtwork(file) {
  const report = { fileName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, checks: [], status: 'ready' }
  report.checks.push({ key:'format', level:'pass', message:'Supported file format' })
  report.checks.push({ key:'size', level:file.size > 20*1024*1024 ? 'warning':'pass', message:file.size > 20*1024*1024 ? 'Large file—production review recommended':'File size is suitable' })
  try {
    const bytes = fs.readFileSync(file.path)
    if (file.mimetype.startsWith('image/')) { const dimensions = readRasterDimensions(bytes,file.mimetype); report.width = dimensions.width; report.height = dimensions.height; const pixels = Math.min(dimensions.width || 0, dimensions.height || 0); report.checks.push({ key:'resolution', level:pixels >= 1200 ? 'pass':'warning', message:pixels >= 1200 ? `${dimensions.width}×${dimensions.height}px—good working resolution`:`${dimensions.width}×${dimensions.height}px—resolution may be low for large print` }) }
    if (file.mimetype === 'application/pdf') { const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true }); report.pages = pdf.getPageCount(); report.checks.push({ key:'pages', level:'pass', message:`${report.pages} PDF page(s) detected` }) }
  } catch { report.checks.push({ key:'inspection', level:'warning', message:'File opens, but detailed preflight requires staff review' }) }
  if (report.checks.some(x => x.level === 'warning')) report.status = 'review'
  return report
}

function readRasterDimensions(buffer,mime) {
  if (mime === 'image/png' && buffer.length >= 24) return { width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20) }
  if ((mime === 'image/jpeg' || mime === 'image/jpg') && buffer.length > 4) {
    let offset=2
    while(offset+9<buffer.length){if(buffer[offset]!==0xff){offset++;continue}const marker=buffer[offset+1],size=buffer.readUInt16BE(offset+2);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return{height:buffer.readUInt16BE(offset+5),width:buffer.readUInt16BE(offset+7)};if(size<2)break;offset+=2+size}
  }
  return {width:0,height:0}
}

async function deliveryEstimate({ address, zone, urgent, lat, lng }) {
  const defaults = ({ Bole:[30,180], Kazanchis:[35,190], Piassa:[45,230], Saris:[30,190], Mexico:[35,200] }[zone] || [50,250])
  let fallbackMinutes=defaults[0],fallbackFee=defaults[1],matchedZone=null,distanceFromFacility=null
  const destinationLat=numberOrNull(lat), destinationLng=numberOrNull(lng)
  try {
    const [zones]=await pool.query('SELECT * FROM delivery_zones WHERE active=1 ORDER BY radius_km')
    if (destinationLat !== null && destinationLng !== null) {
      const destination={lat:destinationLat,lng:destinationLng}
      const candidates=zones.map(row=>{const centerLat=numberOrNull(row.center_lat),centerLng=numberOrNull(row.center_lng);const center=centerLat!==null&&centerLng!==null?{lat:centerLat,lng:centerLng}:facilityCoordinates;return {row,distance:distanceKm(center,destination)}})
      const match=candidates.find(candidate=>Number(candidate.row.radius_km)>=candidate.distance) || null
      distanceFromFacility=match?.distance ?? candidates.sort((a,b)=>a.distance-b.distance)[0]?.distance ?? null
      matchedZone=match?.row || null
    }
    if (!matchedZone && zone) matchedZone=zones.find(row=>row.name.toLowerCase()===String(zone).toLowerCase()) || null
    if (matchedZone) { fallbackFee=Number(matchedZone.fee); fallbackMinutes=Number(matchedZone.eta_minutes) }
  } catch {}
  fallbackMinutes += urgent ? 10 : 20; fallbackFee += urgent ? 80 : 0
  const serviceable=destinationLat!==null&&destinationLng!==null?Boolean(matchedZone):Boolean(matchedZone||zone)
  const fallback={ source:'zone', zone:matchedZone?.name || zone || null, durationSeconds:fallbackMinutes*60, distanceMeters:distanceFromFacility===null?null:Math.round(distanceFromFacility*1000), fee:fallbackFee, trafficAware:false, serviceable }
  if (!process.env.GOOGLE_MAPS_API_KEY || (!address && (destinationLat === null || destinationLng === null))) return fallback
  try {
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),6000)
    const destination=(destinationLat !== null && destinationLng !== null)?{location:{latLng:{latitude:destinationLat,longitude:destinationLng}}}:{address}
    const response=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','X-Goog-Api-Key':process.env.GOOGLE_MAPS_API_KEY,'X-Goog-FieldMask':'routes.duration,routes.distanceMeters'},body:JSON.stringify({origin:{address:facilityAddress},destination,travelMode:'DRIVE',routingPreference:'TRAFFIC_AWARE_OPTIMAL',departureTime:new Date(Date.now()+60000).toISOString()})})
    clearTimeout(timeout); if(!response.ok)throw new Error('Routes unavailable')
    const route=(await response.json()).routes?.[0]; if(!route)throw new Error('No route')
    const seconds=Number(String(route.duration).replace('s','')); return {...fallback,source:'google',durationSeconds:Math.max(seconds,fallback.durationSeconds),distanceMeters:route.distanceMeters,trafficAware:true}
  } catch { return fallback }
}

app.get('/api/health', async (_req,res) => { try { await pool.query('SELECT 1'); res.json({ ok:true, ready:true, service:'maxrez-api' }) } catch { res.status(503).json({ ok:false, ready:false, service:'maxrez-api' }) } })
app.get('/api/setup/status', async (_req,res) => { try { const [users] = await pool.query('SELECT COUNT(*) count FROM users'); res.json({ ready:Number(users[0].count)>0 }) } catch { res.json({ ready:false, database:false }) } })
app.post('/api/setup', authLimit, async (req,res) => { const setupPassword=String(req.body.setupPassword||req.body.setupKey||''); if(!process.env.SETUP_KEY||!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD)return res.status(503).json({error:'Setup is not configured on the server'}); const expected=Buffer.from(process.env.SETUP_KEY); const supplied=Buffer.from(setupPassword); if(supplied.length!==expected.length||!crypto.timingSafeEqual(supplied,expected))return res.status(403).json({error:'Invalid setup password'}); await ensureSchema(); const [existing] = await pool.query('SELECT COUNT(*) count FROM users'); if (Number(existing[0].count)) return res.status(409).json({ error:'Setup has already been completed' }); const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD,12); await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,"admin")',[process.env.ADMIN_NAME||'Maxrez Admin',normalizeEmail(process.env.ADMIN_EMAIL),hash]); res.json({ ok:true }) })

app.post('/api/auth/login', authLimit, async (req,res) => { const [rows] = await pool.query('SELECT * FROM users WHERE email=? AND active=1 LIMIT 1',[normalizeEmail(req.body.email)]); const user=rows[0]; if (!user || !(await bcrypt.compare(req.body.password||'',user.password_hash))) return res.status(401).json({ error:'Invalid email or password' }); res.json({ token:tokenFor(user), user:{ id:user.id,name:user.name,email:user.email,role:user.role } }) })
app.post('/api/customers/register', authLimit, async (req,res) => { const {name,email,phone,password}=req.body; if(!name||!email||!phone||!password||password.length<8) return res.status(400).json({error:'Name, email, phone, and an 8-character password are required'}); try { const hash=await bcrypt.hash(password,12); const [result]=await pool.query('INSERT INTO customer_accounts (name,email,phone,password_hash) VALUES (?,?,?,?)',[name,normalizeEmail(email),phone,hash]); const user={id:result.insertId,name,email:normalizeEmail(email),phone,role:'customer'}; res.status(201).json({token:tokenFor(user,'customer'),user}) } catch(e) { res.status(409).json({error:'An account with this email already exists'}) } })
app.post('/api/customers/login', authLimit, async (req,res) => { const [rows]=await pool.query('SELECT * FROM customer_accounts WHERE email=? AND active=1 LIMIT 1',[normalizeEmail(req.body.email)]); const user=rows[0]; if(!user||!(await bcrypt.compare(req.body.password||'',user.password_hash))) return res.status(401).json({error:'Invalid email or password'}); res.json({token:tokenFor({...user,role:'customer'},'customer'),user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:'customer'}}) })
app.get('/api/customers/orders', customerAuth, async (req,res) => { const [rows]=await pool.query('SELECT public_id,tracking_token,service,total_amount,status,fulfillment_method,created_at,updated_at FROM orders WHERE customer_id=? ORDER BY created_at DESC',[req.user.id]); res.json(rows) })

app.get('/api/products', async (_req,res) => { const [rows]=await pool.query('SELECT id,slug,name,description,category,base_price,minimum_quantity,pricing_rules FROM product_catalog WHERE active=1 ORDER BY sort_order,id'); res.json(rows.map(x=>({...x,pricing_rules:parseJson(x.pricing_rules)}))) })
app.get('/api/admin/products', auth, roles('admin','worker'), async (_req,res) => { const [rows]=await pool.query('SELECT * FROM product_catalog ORDER BY sort_order,id'); res.json(rows.map(x=>({...x,pricing_rules:parseJson(x.pricing_rules)}))) })
app.get('/api/admin/staff', auth, roles('admin'), async (_req,res) => { const [rows]=await pool.query('SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at DESC'); res.json(rows) })
app.post('/api/admin/staff', auth, roles('admin'), async (req,res) => { const {name,email,password,role='worker'}=req.body; const normalizedEmail=normalizeEmail(email); if(!name||!normalizedEmail||!password||password.length<8||!['admin','worker'].includes(role))return res.status(400).json({error:'Name, email, password (8+), and a valid role are required'}); try{const hash=await bcrypt.hash(password,12);const [result]=await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',[name,normalizedEmail,hash,role]);res.status(201).json({id:result.insertId})}catch{res.status(409).json({error:'That staff email is already in use'})} })
app.patch('/api/admin/staff/:id', auth, roles('admin'), async (req,res) => { const {name,email,password,role,active}=req.body; if(role&&!['admin','worker'].includes(role))return res.status(400).json({error:'Invalid role'}); const hash=password&&password.length>=8?await bcrypt.hash(password,12):null; await pool.query('UPDATE users SET name=COALESCE(?,name),email=COALESCE(?,email),password_hash=COALESCE(?,password_hash),role=COALESCE(?,role),active=COALESCE(?,active) WHERE id=?',[name,email?normalizeEmail(email):null,hash,role,active,req.params.id]); res.json({ok:true}) })
app.get('/api/admin/customers', auth, roles('admin','worker'), async (_req,res) => { const [rows]=await pool.query('SELECT c.id,c.name,c.email,c.phone,c.created_at,COUNT(o.id) order_count FROM customer_accounts c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id ORDER BY c.created_at DESC'); res.json(rows) })
app.get('/api/admin/customers/:id/orders', auth, roles('admin','worker'), async (req,res) => { const [rows]=await pool.query('SELECT public_id,tracking_token,service,total_amount,status,fulfillment_method,created_at,updated_at FROM orders WHERE customer_id=? ORDER BY created_at DESC',[req.params.id]); res.json(rows) })
app.get('/api/admin/delivery-zones', auth, roles('admin'), async (_req,res) => { const [rows]=await pool.query('SELECT * FROM delivery_zones ORDER BY radius_km'); res.json(rows) })
app.post('/api/admin/delivery-zones', auth, roles('admin'), async (req,res) => { const {name,radiusKm,fee,etaMinutes=60,centerLat,centerLng}=req.body; if(!name||!Number.isFinite(Number(radiusKm))||Number(radiusKm)<=0||!Number.isFinite(Number(fee))||Number(fee)<0||!Number.isFinite(Number(etaMinutes))||Number(etaMinutes)<=0)return res.status(400).json({error:'Name, positive radius, fee, and ETA are required'});const [result]=await pool.query('INSERT INTO delivery_zones (name,radius_km,fee,eta_minutes,center_lat,center_lng) VALUES (?,?,?,?,?,?)',[name,Number(radiusKm),Number(fee),Number(etaMinutes),numberOrNull(centerLat),numberOrNull(centerLng)]);res.status(201).json({id:result.insertId}) })
app.patch('/api/admin/delivery-zones/:id', auth, roles('admin'), async (req,res) => { const {name,radiusKm,fee,etaMinutes,active,centerLat,centerLng}=req.body; await pool.query('UPDATE delivery_zones SET name=COALESCE(?,name),radius_km=COALESCE(?,radius_km),fee=COALESCE(?,fee),eta_minutes=COALESCE(?,eta_minutes),center_lat=COALESCE(?,center_lat),center_lng=COALESCE(?,center_lng),active=COALESCE(?,active) WHERE id=?',[name,radiusKm,fee,etaMinutes,numberOrNull(centerLat),numberOrNull(centerLng),active,req.params.id]);res.json({ok:true}) })
app.post('/api/admin/products', auth, roles('admin'), async (req,res) => { const {slug,name,description,category,basePrice,minimumQuantity=1,pricingRules=defaultRules,active=true}=req.body; const [result]=await pool.query('INSERT INTO product_catalog (slug,name,description,category,base_price,minimum_quantity,pricing_rules,active) VALUES (?,?,?,?,?,?,?,?)',[slug,name,description,category,basePrice,minimumQuantity,JSON.stringify(pricingRules),active]); res.status(201).json({id:result.insertId}) })
app.patch('/api/admin/products/:id', auth, roles('admin'), async (req,res) => { const {name,description,category,basePrice,minimumQuantity,pricingRules,active,sortOrder}=req.body; await pool.query('UPDATE product_catalog SET name=COALESCE(?,name),description=COALESCE(?,description),category=COALESCE(?,category),base_price=COALESCE(?,base_price),minimum_quantity=COALESCE(?,minimum_quantity),pricing_rules=COALESCE(?,pricing_rules),active=COALESCE(?,active),sort_order=COALESCE(?,sort_order) WHERE id=?',[name,description,category,basePrice,minimumQuantity,pricingRules?JSON.stringify(pricingRules):null,active,sortOrder,req.params.id]); res.json({ok:true}) })
app.post('/api/quote', async (req,res) => { const [rows]=await pool.query('SELECT * FROM product_catalog WHERE id=? AND active=1',[req.body.productId]); if(!rows[0]) return res.status(404).json({error:'Product not found'}); const quote=calculateQuote(rows[0],req.body); const delivery=req.body.fulfillmentMethod==='delivery'?await deliveryEstimate(req.body):{source:'pickup',durationSeconds:0,distanceMeters:0,fee:0,trafficAware:false}; res.json({...quote,delivery,total:Number((quote.subtotal+delivery.fee).toFixed(2)),currency:'ETB'}) })
app.post('/api/delivery-estimate', async (req,res) => res.json(await deliveryEstimate(req.body)))
app.post('/api/artwork/validate', upload.array('artwork',5), async (req,res) => { const reports=[]; for(const file of req.files||[]){reports.push(await validateArtwork(file));fs.unlink(file.path,()=>{})} res.json({reports,status:reports.some(x=>x.status==='review')?'review':'ready'}) })

app.post('/api/orders', uploadLimit, upload.array('artwork',5), async (req,res) => {
  const files=req.files||[], urgent=req.body.urgent==='true'||req.body.urgent===true, fulfillment=req.body.fulfillmentMethod==='delivery'?'delivery':'pickup', details=parseJson(req.body.details,req.body), name=String(req.body.name||'').trim(), phone=String(req.body.phone||'').trim()
  if(!name||!phone){ files.forEach(file=>fs.unlink(file.path,()=>{})); return res.status(400).json({error:'Name and phone are required'}) }
  if(fulfillment==='delivery'&&!String(req.body.deliveryAddress||'').trim()&&!(numberOrNull(req.body.lat)!==null&&numberOrNull(req.body.lng)!==null)){ files.forEach(file=>fs.unlink(file.path,()=>{})); return res.status(400).json({error:'Add a delivery address or pin your location'}) }
  let customerId=null; try { const data=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),process.env.SESSION_SECRET); if(data.kind==='customer')customerId=data.id } catch {}
  const [products]=await pool.query('SELECT * FROM product_catalog WHERE id=? AND active=1',[req.body.productId]); const product=products[0]; if(!product){ files.forEach(file=>fs.unlink(file.path,()=>{})); return res.status(400).json({error:'Choose a valid product'}) }
  const quote=calculateQuote(product,details), delivery=fulfillment==='delivery'?await deliveryEstimate({address:req.body.deliveryAddress,zone:req.body.deliveryZone,urgent,lat:req.body.lat,lng:req.body.lng}):{source:'pickup',durationSeconds:0,distanceMeters:0,fee:0}, reports=[]
  for(const file of files)reports.push(await validateArtwork(file)); const publicId=publicOrderId(),track=trackingToken(),total=Number((quote.subtotal+delivery.fee).toFixed(2)), connection=await pool.getConnection()
  try { await connection.beginTransaction(); const [result]=await connection.query('INSERT INTO orders (public_id,tracking_token,customer_id,product_id,customer_name,customer_phone,customer_email,service,details,pricing_breakdown,artwork_validation,quantity,unit_price,total_amount,status,urgent,fulfillment_method,delivery_address,delivery_zone,destination_lat,destination_lng,delivery_distance_meters,delivery_duration_seconds,delivery_fee,promised_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,? ,"new",?,?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? MINUTE))',[publicId,track,customerId,product.id,name,phone,normalizeEmail(req.body.email)||null,product.name,JSON.stringify(details),JSON.stringify(quote),JSON.stringify(reports),quote.quantity,quote.unitPrice,total,urgent,fulfillment,req.body.deliveryAddress||null,req.body.deliveryZone||null,numberOrNull(req.body.lat),numberOrNull(req.body.lng),delivery.distanceMeters,delivery.durationSeconds,delivery.fee,Math.ceil((delivery.durationSeconds||0)/60)+(urgent?120:1440)]); for(let i=0;i<files.length;i++){const file=files[i];await connection.query('INSERT INTO order_files (order_id,kind,original_name,stored_name,mime_type,size_bytes,validation_report) VALUES (? ,"artwork",?,?,?,?,?)',[result.insertId,file.originalname,file.filename,file.mimetype,file.size,JSON.stringify(reports[i])])} await connection.query('INSERT INTO order_events (order_id,actor_id,status,note) VALUES (?,NULL,"new","Order submitted by customer")',[result.insertId]); await connection.commit(); res.status(201).json({id:publicId,trackingToken:track,status:'new',total,currency:'ETB',artworkValidation:reports,trackingUrl:`/track/${track}`}) } catch(error) { await connection.rollback(); files.forEach(file=>fs.unlink(file.path,()=>{})); console.error('Order creation failed:',error.message); res.status(500).json({error:'Unable to create order right now'}) } finally { connection.release() }
})

app.post('/api/orders', upload.array('artwork',5), async (req,res) => { const customerToken=(req.headers.authorization||'').replace('Bearer ',''); let customerId=null; try { const data=jwt.verify(customerToken,process.env.SESSION_SECRET); if(data.kind==='customer') customerId=data.id } catch {} const [products]=await pool.query('SELECT * FROM product_catalog WHERE id=? AND active=1',[req.body.productId]); const product=products[0]; if(!product) return res.status(400).json({error:'Choose a valid product'}); const details=parseJson(req.body.details,req.body); const quote=calculateQuote(product,details); const delivery=req.body.fulfillmentMethod==='delivery'?await deliveryEstimate({address:req.body.deliveryAddress,zone:req.body.deliveryZone,urgent:req.body.urgent==='true'}):{source:'pickup',durationSeconds:0,distanceMeters:0,fee:0}; const reports=[]; for(const file of req.files||[]) reports.push(await validateArtwork(file)); const name=req.body.name,phone=req.body.phone,email=req.body.email; if(!name||!phone) return res.status(400).json({error:'Name and phone are required'}); const publicId=publicOrderId(), track=trackingToken(), total=quote.subtotal+delivery.fee; const [result]=await pool.query('INSERT INTO orders (public_id,tracking_token,customer_id,product_id,customer_name,customer_phone,customer_email,service,details,pricing_breakdown,artwork_validation,quantity,unit_price,total_amount,status,urgent,fulfillment_method,delivery_address,delivery_zone,delivery_distance_meters,delivery_duration_seconds,delivery_fee,promised_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,"new",?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? MINUTE))',[publicId,track,customerId,product.id,name,phone,email||null,product.name,JSON.stringify(details),JSON.stringify(quote),JSON.stringify(reports),quote.quantity,quote.unitPrice,total,req.body.urgent==='true',req.body.fulfillmentMethod||'pickup',req.body.deliveryAddress||null,req.body.deliveryZone||null,delivery.distanceMeters,delivery.durationSeconds,delivery.fee,Math.ceil((delivery.durationSeconds||0)/60)+(req.body.urgent==='true'?120:1440)]); for(let i=0;i<(req.files||[]).length;i++){const file=req.files[i];await pool.query('INSERT INTO order_files (order_id,kind,original_name,stored_name,mime_type,size_bytes,validation_report) VALUES (?,"artwork",?,?,?,?,?)',[result.insertId,file.originalname,file.filename,file.mimetype,file.size,JSON.stringify(reports[i])])} await event(result.insertId,null,'new','Order submitted by customer'); res.status(201).json({id:publicId,trackingToken:track,status:'new',total,currency:'ETB',artworkValidation:reports,trackingUrl:`/track/${track}`}) })
app.get('/api/tracking/:token', async (req,res) => { const [orders]=await pool.query('SELECT id,public_id,service,total_amount,currency,status,payment_status,urgent,fulfillment_method,delivery_address,delivery_zone,destination_lat,destination_lng,delivery_fee,promised_at,created_at,updated_at FROM orders WHERE tracking_token=?',[req.params.token]); const order=orders[0]; if(!order) return res.status(404).json({error:'Tracking link not found'}); const [events]=await pool.query('SELECT status,note,created_at FROM order_events WHERE order_id=? ORDER BY created_at',[order.id]); res.json({...order,events}) })

app.post('/api/orders/:id/payment-proof', uploadLimit, upload.single('paymentProof'), async (req,res) => {
  const token=String(req.body.trackingToken||''); const [orders]=await pool.query('SELECT id FROM orders WHERE id=? AND tracking_token=?',[req.params.id,token]); const order=orders[0]
  if(!order){ if(req.file)fs.unlink(req.file.path,()=>{}); return res.status(403).json({error:'Valid tracking link required'}) }
  if(!req.file)return res.status(400).json({error:'Choose a payment screenshot or PDF'})
  await pool.query('INSERT INTO order_files (order_id,kind,original_name,stored_name,mime_type,size_bytes) VALUES (?,"payment_proof",?,?,?,?)',[order.id,req.file.originalname,req.file.filename,req.file.mimetype,req.file.size])
  await pool.query('UPDATE orders SET payment_status="submitted",payment_method=COALESCE(?,payment_method),payment_note=? WHERE id=?',[req.body.paymentMethod||null,req.body.note||null,order.id])
  await event(order.id,null,'payment_submitted','Customer submitted payment proof'); res.status(201).json({ok:true,status:'submitted'})
})
app.get('/api/orders/:id/payment-proofs', auth, roles('admin','worker'), async (req,res) => { const [rows]=await pool.query('SELECT id,original_name,mime_type,size_bytes,created_at FROM order_files WHERE order_id=? AND kind="payment_proof" ORDER BY created_at DESC',[req.params.id]); res.json(rows.map(x=>({...x,url:`/api/files/${x.id}`}))) })
app.patch('/api/orders/:id/payment', auth, roles('admin','worker'), async (req,res) => { const paymentStatus=String(req.body.paymentStatus||''); if(!paymentStatuses.includes(paymentStatus))return res.status(400).json({error:'Invalid payment status'}); const [result]=await pool.query('UPDATE orders SET payment_status=?,payment_method=COALESCE(?,payment_method),payment_note=?,payment_verified_by=CASE WHEN ?="verified" THEN ? ELSE NULL END,payment_verified_at=CASE WHEN ?="verified" THEN NOW() ELSE NULL END,status=CASE WHEN ?="verified" THEN "paid" ELSE status END WHERE id=?',[paymentStatus,req.body.paymentMethod||null,req.body.note||null,paymentStatus,req.user.id,paymentStatus,paymentStatus,req.params.id]); if(!result.affectedRows)return res.status(404).json({error:'Order not found'}); await event(req.params.id,req.user.id,`payment_${paymentStatus}`,req.body.note||`Payment ${paymentStatus} by Maxrez staff`); if(paymentStatus==='verified')await event(req.params.id,req.user.id,'paid','Payment verified by Maxrez staff'); res.json({ok:true,paymentStatus}) })

app.get('/api/payment-methods', async (_req,res) => { const [rows]=await pool.query('SELECT id,name,instructions,account_label,qr_url FROM payment_methods WHERE active=1 ORDER BY sort_order,id'); res.json(rows) })
app.post('/api/payment-methods', auth, roles('admin'), async (req,res) => { const {name,instructions,accountLabel}=req.body; const [result]=await pool.query('INSERT INTO payment_methods (name,instructions,account_label) VALUES (?,?,?)',[name,instructions,accountLabel]); res.status(201).json({id:result.insertId}) })
app.patch('/api/payment-methods/:id', auth, roles('admin'), async (req,res) => { const {name,instructions,accountLabel,active,sortOrder}=req.body; await pool.query('UPDATE payment_methods SET name=COALESCE(?,name),instructions=COALESCE(?,instructions),account_label=COALESCE(?,account_label),active=COALESCE(?,active),sort_order=COALESCE(?,sort_order) WHERE id=?',[name,instructions,accountLabel,active,sortOrder,req.params.id]);res.json({ok:true}) })
app.post('/api/admin/payment-methods/:id/qr', auth, roles('admin'), qrUpload.single('qr'), async (req,res) => { if(!req.file)return res.status(400).json({error:'Choose a PNG, JPG, or WebP QR image'}); const url=`/payment-qr/${req.file.filename}`; await pool.query('UPDATE payment_methods SET qr_url=? WHERE id=?',[url,req.params.id]); res.json({ok:true,qrUrl:url}) })

app.get('/api/orders', auth, roles('admin','worker'), async (req,res) => { const [rows]=await pool.query(`SELECT o.*,u.name assigned_worker FROM orders o LEFT JOIN users u ON u.id=o.assigned_worker_id ${req.user.role==='worker'?'WHERE o.assigned_worker_id=? OR o.assigned_worker_id IS NULL':''} ORDER BY o.urgent DESC,o.created_at DESC`,req.user.role==='worker'?[req.user.id]:[]);res.json(rows.map(x=>({...x,details:parseJson(x.details),pricing_breakdown:parseJson(x.pricing_breakdown),artwork_validation:parseJson(x.artwork_validation,[])}))) })
app.patch('/api/orders/:id/status', auth, roles('admin','worker'), async (req,res) => { const next=String(req.body.status||''); if(!orderStatuses.includes(next))return res.status(400).json({error:'Invalid status'}); const [orders]=await pool.query('SELECT status,assigned_worker_id FROM orders WHERE id=?',[req.params.id]); const order=orders[0]; if(!order)return res.status(404).json({error:'Order not found'}); if(req.user.role==='worker'&&order.assigned_worker_id&&Number(order.assigned_worker_id)!==Number(req.user.id))return res.status(403).json({error:'Order is assigned to another worker'}); const [result]=await pool.query('UPDATE orders SET status=? WHERE id=?',[next,req.params.id]); await event(req.params.id,req.user.id,next,req.body.note||`Status changed to ${next.replaceAll('_',' ')}`); res.json({ok:Boolean(result.affectedRows),status:next}) })
app.patch('/api/orders/:id/status', auth, roles('admin','worker'), async (req,res) => { const allowed=['quoted','awaiting_payment','payment_confirmed','design_review','approved','printing','finishing','quality_check','ready','dispatched','delivered','cancelled'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'Invalid status'});const [result]=await pool.query('UPDATE orders SET status=? WHERE id=?',[req.body.status,req.params.id]);if(!result.affectedRows)return res.status(404).json({error:'Order not found'});await event(req.params.id,req.user.id,req.body.status,req.body.note||'Status updated by Maxrez');res.json({ok:true}) })
app.patch('/api/orders/:id/assign', auth, roles('admin'), async (req,res) => { const workerId=req.body.workerId?Number(req.body.workerId):null; if(workerId){const [workers]=await pool.query('SELECT id FROM users WHERE id=? AND role="worker" AND active=1',[workerId]);if(!workers[0])return res.status(400).json({error:'Choose an active worker'})} const [result]=await pool.query('UPDATE orders SET assigned_worker_id=? WHERE id=?',[workerId,req.params.id]); if(!result.affectedRows)return res.status(404).json({error:'Order not found'}); res.json({ok:true}) })
app.patch('/api/orders/:id/assign', auth, roles('admin'), async (req,res) => { await pool.query('UPDATE orders SET assigned_worker_id=? WHERE id=?',[req.body.workerId||null,req.params.id]);res.json({ok:true}) })
app.get('/api/files/:id', auth, roles('admin','worker'), async (req,res) => { const [rows]=await pool.query('SELECT * FROM order_files WHERE id=?',[req.params.id]);if(!rows[0])return res.sendStatus(404);res.download(path.join(uploadDir,rows[0].stored_name),rows[0].original_name) })

app.use('/payment-qr',express.static(paymentQrDir,{index:false,maxAge:'1h'}))
app.use('/images',express.static(path.resolve('images')))
app.use('/assets',express.static(path.resolve('dist/assets')))
app.use(express.static('dist'))
app.use((_req,res)=>res.sendFile(path.resolve('dist/index.html')))
app.use((error,_req,res,_next)=>{ console.error('API error:',error.message); if(res.headersSent)return; res.status(error.statusCode||500).json({error:'Request could not be completed'}) })

ensureSchema().then(()=>app.listen(port,()=>console.log(`Maxrez API listening on ${port}`))).catch(error=>{console.error('Database setup failed:',error.message); if(process.env.NODE_ENV==='production')process.exit(1); app.listen(port,()=>console.log(`Maxrez API listening on ${port} (database pending)`))})
