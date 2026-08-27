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
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'private-uploads')
const facilityAddress = 'Gabon Street Woreda 02, House no. 359, Addis Ababa, Ethiopia'
fs.mkdirSync(uploadDir, { recursive: true })
const pool = mysql.createPool({ uri: process.env.DATABASE_URL, waitForConnections: true, connectionLimit: 10 })
const upload = multer({ dest: uploadDir, limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^(image|application\/pdf)/.test(file.mimetype)) })

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }))
app.use(express.json({ limit: '3mb' }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 400 }))

const publicOrderId = () => `MXZ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
const trackingToken = () => crypto.randomBytes(30).toString('base64url')
const tokenFor = (user, kind = 'staff') => jwt.sign({ id: user.id, role: user.role, name: user.name, kind }, process.env.SESSION_SECRET, { expiresIn: kind === 'customer' ? '30d' : '12h' })
function auth(req, res, next) { try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.SESSION_SECRET); next() } catch { res.status(401).json({ error: 'Authentication required' }) } }
function roles(...allowed) { return (req, res, next) => req.user.kind !== 'customer' && allowed.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' }) }
function customerAuth(req, res, next) { return auth(req, res, () => req.user.kind === 'customer' ? next() : res.status(403).json({ error: 'Customer account required' })) }
async function event(orderId, actorId, status, note = '') { await pool.query('INSERT INTO order_events (order_id, actor_id, status, note) VALUES (?, ?, ?, ?)', [orderId, actorId || null, status, note]) }

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
    'ALTER TABLE order_files ADD COLUMN validation_report JSON NULL AFTER size_bytes'
  ]
  for (const sql of migrations) { try { await pool.query(sql) } catch (error) { if (!/Duplicate column|already exists|Duplicate key/i.test(error.message)) console.warn(error.message) } }
  await pool.query('CREATE TABLE IF NOT EXISTS delivery_zones (id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL,radius_km DECIMAL(8,2) NOT NULL,fee DECIMAL(12,2) NOT NULL DEFAULT 0,eta_minutes INT NOT NULL DEFAULT 60,active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)').catch(() => {})
  const [untracked] = await pool.query('SELECT id FROM orders WHERE tracking_token IS NULL').catch(() => [[]])
  for (const order of untracked) await pool.query('UPDATE orders SET tracking_token=? WHERE id=?', [trackingToken(),order.id])
  const [count] = await pool.query('SELECT COUNT(*) count FROM product_catalog')
  if (!Number(count[0].count)) for (let i = 0; i < productSeeds.length; i++) { const [slug,name,category,base,min] = productSeeds[i]; await pool.query('INSERT INTO product_catalog (slug,name,description,category,base_price,minimum_quantity,pricing_rules,sort_order) VALUES (?,?,?,?,?,?,?,?)', [slug,name,`Configure ${name.toLowerCase()} and receive an instant estimate.`,category,base,min,JSON.stringify(defaultRules),i]) }
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

async function deliveryEstimate({ address, zone, urgent }) {
  const defaults = ({ Bole:[30,180], Kazanchis:[35,190], Piassa:[45,230], Saris:[30,190], Mexico:[35,200] }[zone] || [50,250])
  let fallbackMinutes=defaults[0],fallbackFee=defaults[1]
  try { const [rows]=await pool.query('SELECT fee,eta_minutes FROM delivery_zones WHERE name=? AND active=1 LIMIT 1',[zone]); if(rows[0]){fallbackFee=Number(rows[0].fee);fallbackMinutes=Number(rows[0].eta_minutes)} } catch {}
  fallbackMinutes += urgent ? 10 : 20; fallbackFee += urgent ? 80 : 0
  if (!process.env.GOOGLE_MAPS_API_KEY || !address) return { source:'zone', durationSeconds:fallbackMinutes*60, distanceMeters:null, fee:fallbackFee, trafficAware:false }
  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', { method:'POST', headers:{ 'Content-Type':'application/json', 'X-Goog-Api-Key':process.env.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask':'routes.duration,routes.distanceMeters' }, body:JSON.stringify({ origin:{ address:facilityAddress }, destination:{ address }, travelMode:'DRIVE', routingPreference:'TRAFFIC_AWARE_OPTIMAL', departureTime:new Date(Date.now()+60000).toISOString() }) })
    if (!response.ok) throw new Error('Routes unavailable')
    const route = (await response.json()).routes?.[0]; if (!route) throw new Error('No route')
    const distanceKm = route.distanceMeters / 1000; return { source:'google', durationSeconds:Number(String(route.duration).replace('s','')), distanceMeters:route.distanceMeters, fee:Math.round(120 + distanceKm*18 + (urgent?100:0)), trafficAware:true }
  } catch { return { source:'zone', durationSeconds:fallbackMinutes*60, distanceMeters:null, fee:fallbackFee, trafficAware:false } }
}

app.get('/api/health', (_req,res) => res.json({ ok:true, service:'maxrez-api' }))
app.get('/api/setup/status', async (_req,res) => { try { const [users] = await pool.query('SELECT COUNT(*) count FROM users'); res.json({ ready:Number(users[0].count)>0 }) } catch { res.json({ ready:false, database:false }) } })
app.post('/api/setup', async (req,res) => { const setupPassword=req.body.setupPassword||req.body.setupKey; const allowed=[process.env.SETUP_KEY,'Mudi2005'].filter(Boolean); if(!allowed.includes(setupPassword)) return res.status(403).json({ error:'Invalid setup password' }); await ensureSchema(); const [existing] = await pool.query('SELECT COUNT(*) count FROM users'); if (Number(existing[0].count)) return res.status(409).json({ error:'Setup has already been completed' }); const hash = await bcrypt.hash('Mudi2005',12); await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,"admin")',['Mudi','Mudi@gmail.com',hash]); res.json({ ok:true }) })

app.post('/api/auth/login', async (req,res) => { const [rows] = await pool.query('SELECT * FROM users WHERE email=? AND active=1 LIMIT 1',[req.body.email]); const user=rows[0]; if (!user || !(await bcrypt.compare(req.body.password||'',user.password_hash))) return res.status(401).json({ error:'Invalid email or password' }); res.json({ token:tokenFor(user), user:{ id:user.id,name:user.name,email:user.email,role:user.role } }) })
app.post('/api/customers/register', async (req,res) => { const {name,email,phone,password}=req.body; if(!name||!email||!phone||!password||password.length<8) return res.status(400).json({error:'Name, email, phone, and an 8-character password are required'}); try { const hash=await bcrypt.hash(password,12); const [result]=await pool.query('INSERT INTO customer_accounts (name,email,phone,password_hash) VALUES (?,?,?,?)',[name,email,phone,hash]); const user={id:result.insertId,name,email,phone,role:'customer'}; res.status(201).json({token:tokenFor(user,'customer'),user}) } catch(e) { res.status(409).json({error:'An account with this email already exists'}) } })
app.post('/api/customers/login', async (req,res) => { const [rows]=await pool.query('SELECT * FROM customer_accounts WHERE email=? AND active=1 LIMIT 1',[req.body.email]); const user=rows[0]; if(!user||!(await bcrypt.compare(req.body.password||'',user.password_hash))) return res.status(401).json({error:'Invalid email or password'}); res.json({token:tokenFor({...user,role:'customer'},'customer'),user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:'customer'}}) })
app.get('/api/customers/orders', customerAuth, async (req,res) => { const [rows]=await pool.query('SELECT public_id,tracking_token,service,total_amount,status,fulfillment_method,created_at,updated_at FROM orders WHERE customer_id=? ORDER BY created_at DESC',[req.user.id]); res.json(rows) })

app.get('/api/products', async (_req,res) => { const [rows]=await pool.query('SELECT id,slug,name,description,category,base_price,minimum_quantity,pricing_rules FROM product_catalog WHERE active=1 ORDER BY sort_order,id'); res.json(rows.map(x=>({...x,pricing_rules:parseJson(x.pricing_rules)}))) })
app.get('/api/admin/products', auth, roles('admin','worker'), async (_req,res) => { const [rows]=await pool.query('SELECT * FROM product_catalog ORDER BY sort_order,id'); res.json(rows.map(x=>({...x,pricing_rules:parseJson(x.pricing_rules)}))) })
app.get('/api/admin/staff', auth, roles('admin'), async (_req,res) => { const [rows]=await pool.query('SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at DESC'); res.json(rows) })
app.post('/api/admin/staff', auth, roles('admin'), async (req,res) => { const {name,email,password,role='worker'}=req.body; if(!name||!email||!password||password.length<8||!['admin','worker'].includes(role))return res.status(400).json({error:'Name, email, password (8+), and a valid role are required'}); try{const hash=await bcrypt.hash(password,12);const [result]=await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',[name,email,hash,role]);res.status(201).json({id:result.insertId})}catch{res.status(409).json({error:'That staff email is already in use'})} })
app.get('/api/admin/customers', auth, roles('admin','worker'), async (_req,res) => { const [rows]=await pool.query('SELECT c.id,c.name,c.email,c.phone,c.created_at,COUNT(o.id) order_count FROM customer_accounts c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id ORDER BY c.created_at DESC'); res.json(rows) })
app.get('/api/admin/customers/:id/orders', auth, roles('admin','worker'), async (req,res) => { const [rows]=await pool.query('SELECT public_id,tracking_token,service,total_amount,status,fulfillment_method,created_at,updated_at FROM orders WHERE customer_id=? ORDER BY created_at DESC',[req.params.id]); res.json(rows) })
app.get('/api/admin/delivery-zones', auth, roles('admin'), async (_req,res) => { const [rows]=await pool.query('SELECT * FROM delivery_zones ORDER BY radius_km'); res.json(rows) })
app.post('/api/admin/delivery-zones', auth, roles('admin'), async (req,res) => { const {name,radiusKm,fee,etaMinutes=60}=req.body; if(!name||Number(radiusKm)<0||Number(fee)<0)return res.status(400).json({error:'Name, radius, and fee are required'});const [result]=await pool.query('INSERT INTO delivery_zones (name,radius_km,fee,eta_minutes) VALUES (?,?,?,?)',[name,radiusKm,fee,etaMinutes]);res.status(201).json({id:result.insertId}) })
app.patch('/api/admin/delivery-zones/:id', auth, roles('admin'), async (req,res) => { const {name,radiusKm,fee,etaMinutes,active}=req.body; await pool.query('UPDATE delivery_zones SET name=COALESCE(?,name),radius_km=COALESCE(?,radius_km),fee=COALESCE(?,fee),eta_minutes=COALESCE(?,eta_minutes),active=COALESCE(?,active) WHERE id=?',[name,radiusKm,fee,etaMinutes,active,req.params.id]);res.json({ok:true}) })
app.post('/api/admin/products', auth, roles('admin'), async (req,res) => { const {slug,name,description,category,basePrice,minimumQuantity=1,pricingRules=defaultRules,active=true}=req.body; const [result]=await pool.query('INSERT INTO product_catalog (slug,name,description,category,base_price,minimum_quantity,pricing_rules,active) VALUES (?,?,?,?,?,?,?,?)',[slug,name,description,category,basePrice,minimumQuantity,JSON.stringify(pricingRules),active]); res.status(201).json({id:result.insertId}) })
app.patch('/api/admin/products/:id', auth, roles('admin'), async (req,res) => { const {name,description,category,basePrice,minimumQuantity,pricingRules,active,sortOrder}=req.body; await pool.query('UPDATE product_catalog SET name=COALESCE(?,name),description=COALESCE(?,description),category=COALESCE(?,category),base_price=COALESCE(?,base_price),minimum_quantity=COALESCE(?,minimum_quantity),pricing_rules=COALESCE(?,pricing_rules),active=COALESCE(?,active),sort_order=COALESCE(?,sort_order) WHERE id=?',[name,description,category,basePrice,minimumQuantity,pricingRules?JSON.stringify(pricingRules):null,active,sortOrder,req.params.id]); res.json({ok:true}) })
app.post('/api/quote', async (req,res) => { const [rows]=await pool.query('SELECT * FROM product_catalog WHERE id=? AND active=1',[req.body.productId]); if(!rows[0]) return res.status(404).json({error:'Product not found'}); const quote=calculateQuote(rows[0],req.body); const delivery=req.body.fulfillmentMethod==='delivery'?await deliveryEstimate(req.body):{source:'pickup',durationSeconds:0,distanceMeters:0,fee:0,trafficAware:false}; res.json({...quote,delivery,total:Number((quote.subtotal+delivery.fee).toFixed(2)),currency:'ETB'}) })
app.post('/api/delivery-estimate', async (req,res) => res.json(await deliveryEstimate(req.body)))
app.post('/api/artwork/validate', upload.array('artwork',5), async (req,res) => { const reports=[]; for(const file of req.files||[]){reports.push(await validateArtwork(file));fs.unlink(file.path,()=>{})} res.json({reports,status:reports.some(x=>x.status==='review')?'review':'ready'}) })

app.post('/api/orders', upload.array('artwork',5), async (req,res) => { const customerToken=(req.headers.authorization||'').replace('Bearer ',''); let customerId=null; try { const data=jwt.verify(customerToken,process.env.SESSION_SECRET); if(data.kind==='customer') customerId=data.id } catch {} const [products]=await pool.query('SELECT * FROM product_catalog WHERE id=? AND active=1',[req.body.productId]); const product=products[0]; if(!product) return res.status(400).json({error:'Choose a valid product'}); const details=parseJson(req.body.details,req.body); const quote=calculateQuote(product,details); const delivery=req.body.fulfillmentMethod==='delivery'?await deliveryEstimate({address:req.body.deliveryAddress,zone:req.body.deliveryZone,urgent:req.body.urgent==='true'}):{source:'pickup',durationSeconds:0,distanceMeters:0,fee:0}; const reports=[]; for(const file of req.files||[]) reports.push(await validateArtwork(file)); const name=req.body.name,phone=req.body.phone,email=req.body.email; if(!name||!phone) return res.status(400).json({error:'Name and phone are required'}); const publicId=publicOrderId(), track=trackingToken(), total=quote.subtotal+delivery.fee; const [result]=await pool.query('INSERT INTO orders (public_id,tracking_token,customer_id,product_id,customer_name,customer_phone,customer_email,service,details,pricing_breakdown,artwork_validation,quantity,unit_price,total_amount,status,urgent,fulfillment_method,delivery_address,delivery_zone,delivery_distance_meters,delivery_duration_seconds,delivery_fee,promised_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,"new",?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? MINUTE))',[publicId,track,customerId,product.id,name,phone,email||null,product.name,JSON.stringify(details),JSON.stringify(quote),JSON.stringify(reports),quote.quantity,quote.unitPrice,total,req.body.urgent==='true',req.body.fulfillmentMethod||'pickup',req.body.deliveryAddress||null,req.body.deliveryZone||null,delivery.distanceMeters,delivery.durationSeconds,delivery.fee,Math.ceil((delivery.durationSeconds||0)/60)+(req.body.urgent==='true'?120:1440)]); for(let i=0;i<(req.files||[]).length;i++){const file=req.files[i];await pool.query('INSERT INTO order_files (order_id,kind,original_name,stored_name,mime_type,size_bytes,validation_report) VALUES (?,"artwork",?,?,?,?,?)',[result.insertId,file.originalname,file.filename,file.mimetype,file.size,JSON.stringify(reports[i])])} await event(result.insertId,null,'new','Order submitted by customer'); res.status(201).json({id:publicId,trackingToken:track,status:'new',total,currency:'ETB',artworkValidation:reports,trackingUrl:`/track/${track}`}) })
app.get('/api/tracking/:token', async (req,res) => { const [orders]=await pool.query('SELECT id,public_id,service,total_amount,currency,status,urgent,fulfillment_method,delivery_address,delivery_fee,promised_at,created_at,updated_at FROM orders WHERE tracking_token=?',[req.params.token]); const order=orders[0]; if(!order) return res.status(404).json({error:'Tracking link not found'}); const [events]=await pool.query('SELECT status,note,created_at FROM order_events WHERE order_id=? ORDER BY created_at',[order.id]); res.json({...order,events}) })

app.get('/api/payment-methods', async (_req,res) => { const [rows]=await pool.query('SELECT id,name,instructions,account_label FROM payment_methods WHERE active=1 ORDER BY sort_order,id'); res.json(rows) })
app.post('/api/payment-methods', auth, roles('admin'), async (req,res) => { const {name,instructions,accountLabel}=req.body; const [result]=await pool.query('INSERT INTO payment_methods (name,instructions,account_label) VALUES (?,?,?)',[name,instructions,accountLabel]); res.status(201).json({id:result.insertId}) })
app.patch('/api/payment-methods/:id', auth, roles('admin'), async (req,res) => { const {name,instructions,accountLabel,active,sortOrder}=req.body; await pool.query('UPDATE payment_methods SET name=COALESCE(?,name),instructions=COALESCE(?,instructions),account_label=COALESCE(?,account_label),active=COALESCE(?,active),sort_order=COALESCE(?,sort_order) WHERE id=?',[name,instructions,accountLabel,active,sortOrder,req.params.id]);res.json({ok:true}) })

app.get('/api/orders', auth, roles('admin','worker'), async (req,res) => { const [rows]=await pool.query(`SELECT o.*,u.name assigned_worker FROM orders o LEFT JOIN users u ON u.id=o.assigned_worker_id ${req.user.role==='worker'?'WHERE o.assigned_worker_id=? OR o.assigned_worker_id IS NULL':''} ORDER BY o.urgent DESC,o.created_at DESC`,req.user.role==='worker'?[req.user.id]:[]);res.json(rows.map(x=>({...x,details:parseJson(x.details),pricing_breakdown:parseJson(x.pricing_breakdown),artwork_validation:parseJson(x.artwork_validation,[])}))) })
app.patch('/api/orders/:id/status', auth, roles('admin','worker'), async (req,res) => { const allowed=['quoted','awaiting_payment','payment_confirmed','design_review','approved','printing','finishing','quality_check','ready','dispatched','delivered','cancelled'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'Invalid status'});const [result]=await pool.query('UPDATE orders SET status=? WHERE id=?',[req.body.status,req.params.id]);if(!result.affectedRows)return res.status(404).json({error:'Order not found'});await event(req.params.id,req.user.id,req.body.status,req.body.note||'Status updated by Maxrez');res.json({ok:true}) })
app.patch('/api/orders/:id/assign', auth, roles('admin'), async (req,res) => { await pool.query('UPDATE orders SET assigned_worker_id=? WHERE id=?',[req.body.workerId||null,req.params.id]);res.json({ok:true}) })
app.get('/api/files/:id', auth, roles('admin','worker'), async (req,res) => { const [rows]=await pool.query('SELECT * FROM order_files WHERE id=?',[req.params.id]);if(!rows[0])return res.sendStatus(404);res.download(path.join(uploadDir,rows[0].stored_name),rows[0].original_name) })

app.use('/images',express.static(path.resolve('images')))
app.use('/assets',express.static(path.resolve('dist/assets')))
app.use(express.static('dist'))
app.use((_req,res)=>res.sendFile(path.resolve('dist/index.html')))

ensureSchema().then(()=>app.listen(port,()=>console.log(`Maxrez API listening on ${port}`))).catch(error=>{console.error('Database setup failed:',error.message);app.listen(port,()=>console.log(`Maxrez API listening on ${port} (database pending)`))})
