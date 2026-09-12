import React, { useState } from 'react'

export function StoreWithDrop({ Store, ...props }) { return <Store {...props} /> }

export default function FileDrop({ api }) {
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const submit = async event => {
    event.preventDefault()
    setError('')
    if (!files.length) return setError('Attach at least one file.')
    setStatus('sending')
    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => body.append(key, value))
    files.forEach(file => body.append('files', file))
    try {
      await api('/file-drops', { method: 'POST', body })
      setFiles([])
      setForm({ name: '', phone: '', email: '', note: '' })
      setStatus('sent')
    } catch (submitError) { setStatus('idle'); setError(submitError.message) }
  }
  return <section className="file-drop-section"><div className="file-drop-copy"><div className="eyebrow">SEND FILES DIRECTLY</div><h2>Drop it here.<br/><em>We’ll take it from there.</em></h2><p>Send artwork, photos, documents, or reference files straight to the Maxrez team. No Telegram or WhatsApp needed.</p><span>Up to 10 files · 25 MB each · PDF, images, ZIP, Office files, and more</span></div><form className="file-drop-card" onSubmit={submit}><label className="file-drop-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); setFiles([...event.dataTransfer.files]) }}><span className="file-drop-icon">↥</span><strong>{files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'Tap to choose or drop files here'}</strong><small>{files.length ? files.map(file => file.name).join(' · ') : 'Your files stay private and go to our staff queue.'}</small><input type="file" multiple onChange={event => setFiles([...event.target.files])}/></label><div className="file-drop-fields"><input required placeholder="Your name" value={form.name} onChange={event => update('name', event.target.value)}/><input placeholder="Phone number" value={form.phone} onChange={event => update('phone', event.target.value)}/><input type="email" placeholder="Email (optional)" value={form.email} onChange={event => update('email', event.target.value)}/><textarea placeholder="What would you like us to do? (optional)" rows="3" value={form.note} onChange={event => update('note', event.target.value)}/></div>{error && <p className="error-text">{error}</p>}{status === 'sent' ? <div className="file-drop-success">✓ Files received. Our team will contact you shortly.</div> : <button className="primary full" disabled={status === 'sending'}>{status === 'sending' ? 'Sending securely…' : 'Send files to Maxrez'} →</button>}</form></section>
}
