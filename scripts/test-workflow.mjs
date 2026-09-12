import assert from 'node:assert/strict'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import {spawn} from 'node:child_process'
import {mkdtemp,rm} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {businessMetrics} from '../src/business-metrics.js'
import {assertDecision,validAmount} from '../server/workflow.js'

// This harness only uses a separate, explicitly local test database.
const preview=process.argv.includes('--preview')
const port=preview?3001:3108,dbName=`maxrez_workflow_test_${Date.now()}`
const db=await mysql.createConnection({host:'127.0.0.1',port:Number(process.env.TEST_DB_PORT||3308),user:'root',password:process.env.TEST_DB_PASSWORD||''})
const tmp=await mkdtemp(path.join(os.tmpdir(),'maxrez-workflow-test-'))
let server,output=''
try {
 await db.query(`CREATE DATABASE ${dbName}`)
 const env={...process.env,DATABASE_URL:`mysql://root:${encodeURIComponent(process.env.TEST_DB_PASSWORD||'')}@127.0.0.1:${process.env.TEST_DB_PORT||3308}/${dbName}`,SESSION_SECRET:crypto.randomBytes(32).toString('hex'),PORT:String(port),NODE_ENV:'test',UPLOAD_DIR:path.join(tmp,'uploads'),PAYMENT_QR_DIR:path.join(tmp,'qr')}
 server=spawn(process.execPath,['server.js'],{env,stdio:['ignore','pipe','pipe']})
 server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b)
 const base=`http://127.0.0.1:${port}/api`
 for(let i=0;i<100;i++){try{const r=await fetch(base+'/products');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,100));if(i===99)throw new Error('Test server did not start: '+output)}
 await db.query(`USE ${dbName}`)
 const password='Maxrez-QA-only-2026'
 await db.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,"admin"),(?,?,?,"worker")',['QA Admin','qa-admin@example.test',await bcrypt.hash(password,4),'QA Worker','qa-worker@example.test',await bcrypt.hash(password,4)])
 const json=async(route,body,token,method='POST',expected=200)=>{
  const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)})
  const data=await r.json();assert.equal(r.status,expected,`${route}: ${JSON.stringify(data)}`);return data
 }
 const admin=(await json('/auth/login',{email:'qa-admin@example.test',password})).token
 const worker=(await json('/auth/login',{email:'qa-worker@example.test',password})).token
 const products=await (await fetch(base+'/products')).json();const product=products.find(p=>p.slug==='labels')
 const multipart=async(route,body,token,expected=201)=>{const r=await fetch(base+route,{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body});const data=await r.json();assert.equal(r.status,expected,`${route}: ${JSON.stringify(data)}`);return data}
 const create=async extra=>{const f=new FormData();Object.entries({productId:product.id,name:'QA Print Customer',phone:'000000000',quantity:100,fulfillmentMethod:'pickup',details:JSON.stringify({quantity:100,printWidth:65,printHeight:45,printShape:'rounded',...extra})}).forEach(([k,v])=>f.append(k,String(v)));return multipart('/orders',f)}
 const created=await create();const token=created.trackingToken
 let tracking=await (await fetch(base+`/tracking/${token}`)).json();const id=tracking.id
 assert.ok(id)
 let state=await (await fetch(base+`/tracking/${token}/workflow`)).json();assert.equal(state.workflow.quote_status,'requested')
 await multipart(`/orders/${id}/payment-proof`,new FormData(),null,409)
 await json(`/admin/orders/${id}/quote`,{amount:4000},worker,'POST',403)
 await json(`/admin/orders/${id}/quote`,{amount:-1},admin,'POST',400)
 await json(`/admin/orders/${id}/quote`,{amount:4000,note:'Includes labels and finishing'},admin,'POST',201)
 await json(`/tracking/${token}/quote-response`,{version:1,decision:'changes_requested',note:'Please use clear vinyl'})
 await json(`/admin/orders/${id}/quote`,{amount:4500,note:'Revised material'},admin,'POST',201)
 await json(`/tracking/${token}/quote-response`,{version:1,decision:'accepted'},null,'POST',409)
 await json(`/tracking/${token}/quote-response`,{version:2,decision:'accepted'})
 await json(`/tracking/${token}/quote-response`,{version:2,decision:'accepted'},null,'POST',409)
 const proof=new FormData();proof.append('proof',new Blob(['%PDF-1.4\nQA proposed artwork'],{type:'application/pdf'}),'qa-artwork.pdf')
 await multipart(`/admin/orders/${id}/proofs`,proof,admin)
 await json(`/tracking/${token}/proof-response`,{version:1,decision:'changes_requested',note:'Adjust text size'})
 await multipart(`/admin/orders/${id}/proofs`,proof,admin)
 await json(`/tracking/${token}/proof-response`,{version:1,decision:'approved'},null,'POST',409)
 await json(`/orders/${id}/status`,{status:'completed'},admin,'PATCH',409)
 await json(`/tracking/${token}/proof-response`,{version:2,decision:'approved'})
 await json(`/orders/${id}/payment`,{paymentStatus:'verified'},admin,'PATCH')
 await json(`/orders/${id}/status`,{status:'completed'},admin,'PATCH')
 const reorder=await (await fetch(base+`/tracking/${token}/reorder`)).json();assert.equal(reorder.details.printWidth,65);assert.equal(reorder.slug,'labels')
 await create({reorderToken:token})
 await json('/admin/stories',{kind:'review',title:'Test review',published:true,consent:false},admin,'POST',400)
 await json('/admin/stories',{kind:'review',title:'QA review',description:'Local synthetic test only',published:false,consent:true},admin)
 assert.equal((await (await fetch(base+'/stories')).json()).length,0)
 const rows=await (await fetch(base+'/admin/workflow',{headers:{Authorization:`Bearer ${admin}`}})).json()
 const m=businessMetrics(rows,'all');assert.equal(m.completed,1);assert.equal(m.paidValue,4500);assert.equal(m.repeat,1);assert.ok(m.turnaround>=0);assert.equal(m.conversion,50)
 assert.throws(()=>validAmount(NaN));assert.throws(()=>assertDecision(2,1,'sent','sent'))
 const wrong=await fetch(base+'/tracking/not-a-token/workflow');assert.equal(wrong.status,404)
 console.log('PASS: real database quote revisions, stale approvals, worker permissions, payment and production gates, proof versions, reorders, review consent, analytics and invalid tokens.')
 if(preview){console.log(`Local QA preview at http://127.0.0.1:${port}; tracking /track/${token}; login qa-admin@example.test / ${password}. All data is synthetic.`);await new Promise(()=>{})}
} catch(error) { console.error(output); throw error } finally {
 if(server){server.kill();await new Promise(resolve=>server.once('exit',resolve))}
 await db.query(`DROP DATABASE IF EXISTS ${dbName}`)
 await db.end()
 await rm(tmp,{recursive:true,force:true})
}
