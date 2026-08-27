import React, { useEffect, useState } from 'react'

export default function SettingsPanel({ api }) {
  const session = JSON.parse(localStorage.getItem('maxrez-session') || 'null')
  const headers = session ? { Authorization: `Bearer ${session.token}` } : {}
  const [methods, setMethods] = useState([])
  const [message, setMessage] = useState('')
  const load = () => api('/payment-methods').then(setMethods).catch(e => setMessage(e.message))
  useEffect(load, [])
  const save = async method => { await api(`/payment-methods/${method.id}`, { method:'PATCH', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({accountLabel:method.account_label,instructions:method.instructions}) }); setMessage('Payment details saved.'); load() }
  const upload = async (id, file) => { const body = new FormData(); body.append('qr', file); await api(`/admin/payment-methods/${id}/qr`, { method:'POST', headers, body }); setMessage('QR uploaded.'); load() }
  return <div className="settings-panel"><div className="admin-note"><h2>Payment settings</h2><p>Customers see these details after submitting an order. Add the exact number and upload a clear QR screenshot.</p></div>{message&&<p className="form-note">{message}</p>}{methods.map((method,index)=><article className="settings-method" key={method.id}><h3>{method.name}</h3><label>Account / phone number<input value={method.account_label||''} onChange={e=>setMethods(methods.map((m,i)=>i===index?{...m,account_label:e.target.value}:m))}/></label><label>Customer instructions<input value={method.instructions||''} onChange={e=>setMethods(methods.map((m,i)=>i===index?{...m,instructions:e.target.value}:m))}/></label>{method.qr_url&&<img className="payment-qr-preview" src={method.qr_url} alt={`${method.name} QR code`}/>}<input type="file" accept="image/*" onChange={e=>e.target.files[0]&&upload(method.id,e.target.files[0])}/><button className="primary" onClick={()=>save(method)}>Save {method.name}</button></article>)}</div>
}
