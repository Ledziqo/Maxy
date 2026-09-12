import fs from 'node:fs/promises'
import path from 'node:path'
import multer from 'multer'

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
export function validAmount(value) {
  const amount = Number(value)
  if (value === '' || value == null || !Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) throw fail('Enter a positive price in ETB.')
  return Math.round(amount * 100) / 100
}
export function assertDecision(current, version, status, waiting) {
  if (Number(current) !== Number(version) || status !== waiting) throw fail('This version has changed or already received a response. Refresh to review the latest version.', 409)
}
export async function ensureWorkflow(pool) {
  const sql = await fs.readFile(path.resolve('server/workflow.sql'), 'utf8')
  for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await pool.query(statement)
}

export function registerWorkflow(app, { pool, auth, roles, customerAuth, uploadDir, uploadLimit }) {
  const staff = [auth, roles('admin', 'worker')]
  const admin = [auth, roles('admin')]
  const proofUpload = multer({ dest: uploadDir, limits: { fileSize: 50 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => /^(image\/(png|jpeg|webp)|application\/pdf)$/.test(file.mimetype) ? cb(null, true) : cb(fail('Choose a PDF, JPG, PNG or WebP proof.')) })
  const imageUpload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024, files: 1 }, fileFilter: (_req,file,cb)=> /^image\/(png|jpeg|webp)$/.test(file.mimetype)?cb(null,true):cb(fail('Choose a JPG, PNG or WebP photo.')) })
  app.post('/api/admin/story-image',...admin,imageUpload.single('image'),async(req,res)=>{
    if(!req.file)throw fail('Choose a photo.')
    const extension={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'}[req.file.mimetype]
    const folder=path.resolve('images/community')
    await fs.mkdir(folder,{recursive:true})
    await fs.rename(req.file.path,path.join(folder,req.file.filename+extension))
    res.status(201).json({url:`/images/community/${req.file.filename}${extension}`})
  })
  const transaction = async action => {
    const c = await pool.getConnection()
    try { await c.beginTransaction(); const result = await action(c); await c.commit(); return result }
    catch (e) { await c.rollback(); throw e } finally { c.release() }
  }
  const record = (c, id, actor, status, note) => c.query('INSERT INTO order_events (order_id,actor_id,status,note) VALUES (?,?,?,?)', [id, actor, status, note])
  const owned = async (c, token, lock = false) => {
    const [rows] = await c.query(`SELECT * FROM orders WHERE tracking_token=?${lock ? ' FOR UPDATE' : ''}`, [token])
    if (!rows[0]) throw fail('Order not found.', 404)
    return rows[0]
  }
  const staffOrder = async (c, id, user) => {
    const [rows] = await c.query('SELECT * FROM orders WHERE id=? FOR UPDATE', [id])
    const o = rows[0]
    if (!o) throw fail('Order not found.', 404)
    if (user.role !== 'admin' && o.assigned_worker_id && Number(o.assigned_worker_id) !== user.id) throw fail('This job is assigned to another worker.', 403)
    return o
  }
  const history = async (id, isStaff = false) => {
    const [[workflow], [quotes], [proofs]] = await Promise.all([
      pool.query('SELECT * FROM order_workflows WHERE order_id=?', [id]),
      pool.query('SELECT id,version,amount,note,status,customer_note,created_at,responded_at FROM quote_versions WHERE order_id=? ORDER BY version DESC', [id]),
      pool.query(`SELECT id,version,original_name,mime_type,note,customer_note,status,created_at,responded_at${isStaff ? ',stored_name' : ''} FROM artwork_proofs WHERE order_id=? ORDER BY version DESC`, [id])
    ])
    return { workflow: workflow[0] || null, quotes, proofs }
  }
  app.get('/api/tracking/:token/workflow', async (req, res) => { const o = await owned(pool, req.params.token); res.json(await history(o.id)) })
  app.get('/api/admin/workflow', ...staff, async (req, res) => {
    const [rows] = await pool.query(`SELECT o.*,w.estimate,w.quote_status,w.quote_version,w.proof_version,w.completed_at,p.status proof_status FROM orders o LEFT JOIN order_workflows w ON w.order_id=o.id LEFT JOIN artwork_proofs p ON p.order_id=o.id AND p.version=w.proof_version ${req.user.role === 'admin' ? '' : 'WHERE o.assigned_worker_id IS NULL OR o.assigned_worker_id=?'} ORDER BY o.created_at DESC`, req.user.role === 'admin' ? [] : [req.user.id])
    res.json(rows)
  })
  app.get('/api/admin/orders/:id/workflow', ...staff, async (req, res) => {
    await transaction(c => staffOrder(c, req.params.id, req.user))
    const [files] = await pool.query('SELECT id,original_name,size_bytes FROM order_files WHERE order_id=? AND kind="artwork"', [req.params.id])
    res.json({ ...await history(req.params.id), files })
  })
  app.post('/api/admin/orders/:id/quote', ...admin, async (req, res) => {
    const amount = validAmount(req.body.amount)
    const due = req.body.promisedAt ? new Date(req.body.promisedAt) : null
    if(due && !Number.isFinite(due.getTime())) throw fail('Choose a valid completion date.')
    const result = await transaction(async c => {
      const o = await staffOrder(c, req.params.id, req.user)
      if (o.payment_status === 'verified' || o.payment_status === 'submitted' || ['completed','cancelled','out_for_delivery'].includes(o.status)) throw fail('This job cannot be repriced while payment is under review or after payment / closure.', 409)
      await c.query('INSERT IGNORE INTO order_workflows (order_id,estimate) VALUES (?,?)', [o.id, o.total_amount])
      const [[w]] = await c.query('SELECT * FROM order_workflows WHERE order_id=? FOR UPDATE', [o.id])
      const version = w.quote_version + 1
      await c.query('INSERT INTO quote_versions (order_id,version,amount,note,actor_id) VALUES (?,?,?,?,?)', [o.id, version, amount, String(req.body.note || '').slice(0,4000), req.user.id])
      await c.query('UPDATE order_workflows SET quote_version=?,quote_status="sent" WHERE order_id=?', [version, o.id])
      await c.query('UPDATE orders SET total_amount=?,status="new" WHERE id=?', [amount,o.id])
      if(due)await c.query('UPDATE orders SET promised_at=? WHERE id=?',[due,o.id])
      await record(c,o.id,req.user.id,'quote_sent',`Quote v${version}: ${amount} ETB. Awaiting customer approval.`)
      return { version }
    }); res.status(201).json(result)
  })
  app.post('/api/tracking/:token/quote-response', uploadLimit, async (req,res) => {
    const decision = req.body.decision
    if (!['accepted','changes_requested'].includes(decision)) throw fail('Choose approve or request changes.')
    const note = String(req.body.note || '').trim().slice(0,4000)
    if (decision === 'changes_requested' && !note) throw fail('Describe the changes you need.')
    await transaction(async c => {
      const o = await owned(c,req.params.token,true)
      if (o.status === 'cancelled') throw fail('This request is cancelled.',409)
      const [[w]] = await c.query('SELECT * FROM order_workflows WHERE order_id=? FOR UPDATE',[o.id])
      if (!w) throw fail('No quote is awaiting approval.',409)
      assertDecision(w.quote_version,req.body.version,w.quote_status,'sent')
      await c.query('UPDATE quote_versions SET status=?,customer_note=?,responded_at=NOW() WHERE order_id=? AND version=?',[decision,note,o.id,w.quote_version])
      await c.query('UPDATE order_workflows SET quote_status=? WHERE order_id=?',[decision,o.id])
      await c.query('UPDATE orders SET status=? WHERE id=?',[decision==='accepted'?'confirmed':'new',o.id])
      await record(c,o.id,null,`quote_${decision}`,`Customer ${decision.replaceAll('_',' ')} quote v${w.quote_version}. ${note}`)
    }); res.json({ok:true})
  })
  app.post('/api/admin/orders/:id/proofs', ...staff, uploadLimit, proofUpload.single('proof'), async (req,res) => {
    if (!req.file) throw fail('Attach the proposed artwork.')
    try {
      const result = await transaction(async c => {
        const o = await staffOrder(c,req.params.id,req.user)
        if (['completed','cancelled','out_for_delivery'].includes(o.status)) throw fail('This job is closed for artwork changes.',409)
        await c.query('INSERT IGNORE INTO order_workflows (order_id,estimate,quote_status) VALUES (?,?,?)',[o.id,o.total_amount,o.status==='new'?'requested':'accepted'])
        const [[w]] = await c.query('SELECT * FROM order_workflows WHERE order_id=? FOR UPDATE',[o.id])
        const version = w.proof_version+1
        await c.query('INSERT INTO artwork_proofs (order_id,version,original_name,stored_name,mime_type,note,actor_id) VALUES (?,?,?,?,?,?,?)',[o.id,version,req.file.originalname,req.file.filename,req.file.mimetype,String(req.body.note||'').slice(0,4000),req.user.id])
        await c.query('UPDATE order_workflows SET proof_version=? WHERE order_id=?',[version,o.id])
        await record(c,o.id,req.user.id,'proof_sent',`Artwork proof v${version} is ready for review.`)
        return {version}
      }); res.status(201).json(result)
    } catch(e) { await fs.unlink(req.file.path).catch(()=>{}); throw e }
  })
  app.get('/api/tracking/:token/proofs/:version', async (req,res) => {
    const o=await owned(pool,req.params.token)
    const [[p]]=await pool.query('SELECT * FROM artwork_proofs WHERE order_id=? AND version=?',[o.id,req.params.version])
    if(!p) throw fail('Proof unavailable.',404)
    res.set('Cache-Control','private, no-store'); res.download(path.join(uploadDir,p.stored_name),p.original_name)
  })
  app.post('/api/tracking/:token/proof-response', uploadLimit, async(req,res)=>{
    const decision=req.body.decision, note=String(req.body.note||'').trim().slice(0,4000)
    if(!['approved','changes_requested'].includes(decision)) throw fail('Choose approve or request changes.')
    if(decision==='changes_requested'&&!note) throw fail('Describe the changes you need.')
    await transaction(async c=>{
      const o=await owned(c,req.params.token,true)
      if(['cancelled','completed','out_for_delivery'].includes(o.status)) throw fail('This job is closed for artwork changes.',409)
      const [[w]]=await c.query('SELECT * FROM order_workflows WHERE order_id=? FOR UPDATE',[o.id])
      const [[p]]=await c.query('SELECT * FROM artwork_proofs WHERE order_id=? AND version=?',[o.id,w?.proof_version||0])
      if(!p) throw fail('No proof is awaiting approval.',409)
      assertDecision(w.proof_version,req.body.version,p.status,'pending')
      await c.query('UPDATE artwork_proofs SET status=?,customer_note=?,responded_at=NOW() WHERE id=?',[decision,note,p.id])
      await record(c,o.id,null,`proof_${decision}`,`Customer ${decision.replaceAll('_',' ')} artwork v${p.version}. ${note}`)
    });res.json({ok:true})
  })
  // Guard the existing payment and production endpoints, including direct API requests.
  app.use('/api/orders/:id',async(req,res,next)=>{
    const payment = (req.path==='/payment-proof'&&req.method==='POST') || (req.path==='/payment'&&req.method==='PATCH'&&['submitted','verified'].includes(req.body?.paymentStatus))
    const production=req.path==='/status'&&req.method==='PATCH'&&['confirmed','paid','out_for_delivery','completed'].includes(req.body?.status)
    if(!payment&&!production)return next()
    const [[w]]=await pool.query('SELECT w.*,o.status,o.payment_status FROM order_workflows w JOIN orders o ON o.id=w.order_id WHERE order_id=?',[req.params.id])
    if(w&&(w.quote_status!=='accepted'||w.status==='cancelled'))throw fail('The customer must approve the latest quote before payment or production.',409)
    if(production&&w&&['paid','out_for_delivery','completed'].includes(req.body.status)){
      if(w.payment_status!=='verified')throw fail('Verify payment before advancing production.',409)
      const [[p]]=await pool.query('SELECT status FROM artwork_proofs WHERE order_id=? AND version=?',[req.params.id,w.proof_version])
      if(!p||p.status!=='approved')throw fail('The customer must approve the latest artwork proof before production or completion.',409)
    }
    next()
  })
  app.get('/api/tracking/:token/reorder', async(req,res)=>{
    const o=await owned(pool,req.params.token)
    const [[p]]=await pool.query('SELECT slug,active FROM product_catalog WHERE id=?',[o.product_id])
    if(!p?.active)throw fail('This product is no longer available. Contact Maxrez for a replacement.',409)
    const details=typeof o.details==='string'?JSON.parse(o.details):o.details||{}
    res.json({slug:p.slug,details:{...details,name:o.customer_name,phone:o.customer_phone,email:o.customer_email||'',reorderToken:req.params.token},reference:o.public_id})
  })
  app.get('/api/stories',async(_req,res)=>{
    const [rows]=await pool.query('SELECT id,kind,title,category,description,image_url,customer_name FROM site_stories WHERE published=1 AND (kind<>"review" OR consent=1) ORDER BY id DESC');res.json(rows)
  })
  app.get('/api/admin/stories',...admin,async(_req,res)=>{const [rows]=await pool.query('SELECT * FROM site_stories ORDER BY id DESC');res.json(rows)})
  app.post('/api/admin/stories',...admin,async(req,res)=>{
    const b=req.body
    if(!['project','studio','review'].includes(b.kind)||!String(b.title||'').trim())throw fail('Choose a content type and title.')
    const image=String(b.image_url||'')
    if(image&&!/^\/images\/[a-zA-Z0-9_./% -]+$/.test(image))throw fail('Choose an image from the Maxrez image library.')
    if(image.includes('..')||image.toLowerCase().includes('%2e'))throw fail('Choose an image inside the image library.')
    if(b.published&&b.kind!=='review'&&!image)throw fail('Add a project or studio photo before publishing.')
    if(b.kind==='review'&&b.published&&!b.consent)throw fail('Confirm customer permission before publishing a review.')
    const values=[b.kind,String(b.title).slice(0,160),String(b.category||'Studio').slice(0,80),String(b.description||'').slice(0,5000),image,String(b.customer_name||'').slice(0,160),Boolean(b.consent),Boolean(b.published)]
    if(b.id)await pool.query('UPDATE site_stories SET kind=?,title=?,category=?,description=?,image_url=?,customer_name=?,consent=?,published=? WHERE id=?',[...values,b.id])
    else await pool.query('INSERT INTO site_stories (kind,title,category,description,image_url,customer_name,consent,published) VALUES (?,?,?,?,?,?,?,?)',values)
    res.json({ok:true})
  })
}
