import React, { useState } from 'react'
import { useSiteLanguage } from './StorefrontEnhancements.jsx'

export function StoreWithDrop({ Store, ...props }) { return <Store {...props} /> }

const MAX_FILES = 10
const MAX_FILE_SIZE = 50 * 1024 * 1024
const MAX_TOTAL_SIZE = 300 * 1024 * 1024
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.svg,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.ai,.psd,.eps,.tif,.tiff'

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

function fileKey(file) { return `${file.name}-${file.size}-${file.lastModified}` }

function isSupported(file) {
  const type = file.type || ''
  const extension = file.name.includes('.') ? `.${file.name.split('.').pop().toLowerCase()}` : ''
  return type.startsWith('image/') || type === 'application/pdf' || type === 'application/zip' || type.startsWith('application/vnd.') || type.startsWith('text/') || type === 'application/octet-stream' || ACCEPTED_EXTENSIONS.split(',').includes(extension)
}

export default function FileDrop({ api }) {
  const am = useSiteLanguage() === 'am'
  const copy = am ? { eyebrow:'ፋይሎችን በቀጥታ ይላኩ', title:'እዚህ ይጣሉ።', titleEm:'ቀሪውን እኛ እንወስዳለን።', intro:'ስዕሎችን፣ ፎቶዎችን፣ ሰነዶችን ወይም የማጣቀሻ ፋይሎችን በቀጥታ ለMaxrez ቡድን ይላኩ። Telegram ወይም WhatsApp አያስፈልግም።', limits:'እስከ 10 ፋይሎች · እያንዳንዱ 50 MB · በአጠቃላይ 300 MB · PDF፣ ምስሎች፣ ZIP፣ Office ፋይሎች እና ሌሎች', choose:'ለመምረጥ ይንኩ ወይም ፋይሎችን እዚህ ይጣሉ', private:'ፋይሎችዎ የግል ሆነው ወደ ሰራተኞቻችን ይደርሳሉ።', name:'ስምዎ', phone:'ስልክ ቁጥር', email:'ኢሜይል (አማራጭ)', note:'ምን እንድናደርግልዎ ይፈልጋሉ? (አማራጭ)', sent:'✓ ፋይሎችዎ ደርሰዋል። ቡድናችን በቅርቡ ያነጋግርዎታል።', send:'ፋይሎችን ለMaxrez ይላኩ' } : { eyebrow:'SEND FILES DIRECTLY', title:'Drop it here.', titleEm:'We’ll take it from there.', intro:'Send artwork, photos, documents, or reference files straight to the Maxrez team. No Telegram or WhatsApp needed.', limits:'Up to 10 files · 50 MB each · 300 MB total · PDF, images, ZIP, Office files, and more', choose:'Tap to choose or drop files here', private:'Your files stay private and go to our staff queue.', name:'Your name', phone:'Phone number', email:'Email (optional)', note:'What would you like us to do? (optional)', sent:'✓ Files received. Our team will contact you shortly.', send:'Send files to Maxrez' }
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' })
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const addFiles = fileList => {
    const incoming = [...fileList]
    const problems = []
    const valid = incoming.filter(file => {
      if (!isSupported(file)) { problems.push(`${file.name} is not a supported file type.`); return false }
      if (file.size > MAX_FILE_SIZE) { problems.push(`${file.name} is larger than 50 MB.`); return false }
      return true
    })
    const merged = [...files, ...valid].filter((file, index, list) => list.findIndex(item => fileKey(item) === fileKey(file)) === index)
    if (merged.length > MAX_FILES) problems.push(`You can attach up to ${MAX_FILES} files.`)
    const limited = merged.slice(0, MAX_FILES)
    const total = limited.reduce((sum, file) => sum + file.size, 0)
    if (total > MAX_TOTAL_SIZE) problems.push('The selected files must be 300 MB or less in total.')
    if (total <= MAX_TOTAL_SIZE) setFiles(limited)
    setError(problems.join(' '))
  }
  const removeFile = fileToRemove => setFiles(current => current.filter(file => fileKey(file) !== fileKey(fileToRemove)))
  const submit = async event => {
    event.preventDefault()
    setError('')
    if (!files.length) return setError('Attach at least one file.')
    setStatus('sending')
    setProgress(0)
    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => body.append(key, value))
    files.forEach(file => body.append('files', file))
    try {
      await api('/file-drops', { method: 'POST', body, onUploadProgress: setProgress })
      setFiles([])
      setForm({ name: '', phone: '', email: '', note: '' })
      setProgress(100)
      setStatus('sent')
    } catch (submitError) { setStatus('idle'); setProgress(0); setError(submitError.message) }
  }
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  return <section className="file-drop-section">
    <div className="file-drop-copy">
      <div className="eyebrow">{copy.eyebrow}</div>
      <h2>{copy.title}<br/><em>{copy.titleEm}</em></h2>
      <p>{copy.intro}</p>
      <span>{copy.limits}</span>
    </div>
    <form className="file-drop-card" onSubmit={submit}>
      <label className="file-drop-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles(event.dataTransfer.files) }}>
        <span className="file-drop-icon">↥</span>
        <strong>{files.length ? `${files.length} ${am ? 'ፋይል' : `file${files.length === 1 ? '' : 's'}`} ${am ? 'ተመርጧል' : 'selected'}` : copy.choose}</strong>
        <small>{files.length ? `${formatBytes(totalSize)} ${am ? 'ከ 300 MB ተመርጧል' : 'of 300 MB selected'}` : copy.private}</small>
        <input type="file" multiple accept={ACCEPTED_EXTENSIONS} onChange={event => { addFiles(event.target.files); event.currentTarget.value = '' }}/>
      </label>
      {files.length > 0 && <div className="file-drop-list" aria-live="polite">{files.map(file => <div className="file-drop-file" key={fileKey(file)}><span title={file.name}>{file.name}</span><small>{formatBytes(file.size)}</small><button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(file)}>×</button></div>)}</div>}
      <div className="file-drop-fields">
        <input required placeholder={copy.name} value={form.name} onChange={event => update('name', event.target.value)}/>
        <input placeholder={copy.phone} value={form.phone} onChange={event => update('phone', event.target.value)}/>
        <input type="email" placeholder={copy.email} value={form.email} onChange={event => update('email', event.target.value)}/>
        <textarea placeholder={copy.note} rows="3" value={form.note} onChange={event => update('note', event.target.value)}/>
      </div>
      {status === 'sending' && <div className="file-drop-progress" role="status"><div><span>Uploading your files…</span><b>{progress}%</b></div><i><em style={{ width: `${progress}%` }}/></i><small>Please keep this page open until the upload finishes.</small></div>}
      {error && <p className="error-text" role="alert">{error}</p>}
      {status === 'sent' ? <div className="file-drop-success">{copy.sent}</div> : <button className="primary full" disabled={status === 'sending'}>{status === 'sending' ? `${am ? 'በመጫን ላይ' : 'Uploading'} ${progress}%…` : copy.send} →</button>}
    </form>
  </section>
}
