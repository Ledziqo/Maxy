import assert from 'node:assert/strict'
import {createServer} from 'vite'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {previewDimensions,itemKind,artworkKinds,validatePrintForm} from '../src/print-preview-model.js'
import {paymentBreakdown} from '../src/payment-breakdown.js'
import {packages} from '../src/packages.js'
import {productRules} from '../src/product-specs.js'

assert.deepEqual(previewDimensions('business-cards',{size:'85x55',printWidth:150,printHeight:100}),[85,55])
assert.deepEqual(previewDimensions('business-cards',{size:'square'}),[55,55])
assert.deepEqual(previewDimensions('labels',{printWidth:80,printHeight:40,printShape:'circle'}),[80,80])
assert.deepEqual(previewDimensions('cosmetic-cartons',{}),[70,170])
assert.deepEqual(previewDimensions('books',{size:'A4'}),[210,297])
assert.deepEqual(previewDimensions('large-format',{size:'2x1'}),[2000,1000])
assert.deepEqual(previewDimensions('pouches',{printWidth:180,printHeight:260}),[180,260])
assert.equal(itemKind('Takeaway boxes'),'takeaway')
assert.equal(itemKind('Hair-food jar labels'),'jar')
assert.equal(itemKind('Shampoo labels'),'bottle')
assert.equal(itemKind('Catalogues'),'catalogue')
assert.equal(itemKind('Loyalty cards'),'loyalty')
assert.equal(itemKind('Certificates'),'certificate')
assert.equal(validatePrintForm({slug:'packaging',minimum_quantity:1},{quantity:20,printWidth:-1}),'Dimensions must be between 1 and 5,000 mm.')
assert.ok(validatePrintForm({pricing_rules:{packageItems:packages[0].packageItems}},{packageQuantities:Object.fromEntries(packages[0].packageItems.map(i=>[i.id,0]))}))
const custom={sizes:[{value:'studio-size',label:'My studio size',multiplier:2}],materials:[]}
assert.equal(productRules('pouches',custom),custom,'Admin-customized sizes must remain untouched')

const now=Date.parse('2026-09-12T12:00:00Z'),recent='2026-09-11T12:00:00Z'
const orders=[
 {id:1,payment_status:'verified',payment_method:'Telebirr',total_amount:'100.10',payment_verified_at:recent},
 {id:2,payment_status:'verified',payment_method:' telebirr ',total_amount:'20.20',payment_verified_at:recent},
 {id:3,payment_status:'verified',payment_method:'CBE',total_amount:50,payment_verified_at:recent},
 {id:4,payment_status:'submitted',payment_method:'CBE',total_amount:1000,payment_verified_at:recent},
 {id:5,payment_status:'verified',payment_method:null,total_amount:10,payment_verified_at:recent},
 {id:6,payment_status:'verified',payment_method:'Cash',total_amount:5,payment_verified_at:null},
 {id:7,payment_status:'verified',payment_method:'Cash',total_amount:2,payment_verified_at:'2026-01-01T00:00:00Z'},
 {id:8,payment_status:'rejected',total_amount:200,payment_verified_at:recent},
 {id:9,payment_status:'verified',total_amount:null,payment_verified_at:recent}
]
const current=paymentBreakdown(orders,'30',now)
assert.equal(current.total,180.3)
assert.equal(current.rows.find(r=>r.name==='Telebirr').amount,120.3)
assert.equal(current.rows.find(r=>r.name==='Telebirr').count,2)
assert.equal(current.rows.find(r=>r.name==='Unspecified').amount,10)
assert.equal(current.undated,1)
assert.equal(current.entries.length,4)
assert.equal(paymentBreakdown(orders,'all',now).total,187.3)

const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
try {
 const {default:PrintArtwork}=await vite.ssrLoadModule('/src/PrintArtwork.jsx')
 for(const slug of Object.keys(artworkKinds)){
   const html=renderToStaticMarkup(React.createElement(PrintArtwork,{slug,form:{size:'A4'}}))
   assert.ok(html.includes('<svg'),slug)
   assert.ok(!html.includes('NaN'),slug)
   assert.ok(html.includes('max'),slug+' branding')
 }
 for(const pack of packages){
   const html=renderToStaticMarkup(React.createElement(PrintArtwork,{slug:'package-'+pack.slug,rules:{packageItems:pack.packageItems}}))
   assert.equal((html.match(/<figure/g)||[]).length,5,pack.slug)
   for(const item of pack.packageItems)assert.ok(html.includes(item.name),item.name)
 }
 const removed=renderToStaticMarkup(React.createElement(PrintArtwork,{slug:'package-cosmetics',form:{packageQuantities:{'item-0':0}}}))
 assert.ok(removed.includes('Not included'))
 const customItem=renderToStaticMarkup(React.createElement(PrintArtwork,{slug:'package-cosmetics',rules:{packageItems:[{id:'new',name:'Custom welcome insert',quantity:10}]}}))
 assert.ok(customItem.includes('Custom welcome insert'))
 assert.ok(!customItem.includes('Shampoo'))
 console.log('PASS: all 17 standalone illustrations, 6 packages, dynamic contents, dimensions, validation, admin-rule preservation and payment totals.')
} finally {await vite.close()}
