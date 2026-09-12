import React, { useEffect, useMemo, useState } from 'react'
import { Bell, Check, ChevronRight, Leaf, MessageSquareText, Package, Palette, ShoppingBag, Sparkles, X } from 'lucide-react'

const categoryOrder = ['Cards & stationery', 'Marketing print', 'Labels', 'Packaging', 'Publishing', 'Large format', 'Prepress', 'Industry bundles', 'Custom']
const categoryCopy = {
  'Cards & stationery': 'Business cards, letterheads, folders, and everyday office print.',
  'Marketing print': 'Flyers, brochures, menus, reports, and campaigns that get noticed.',
  Labels: 'Product labels, seals, stickers, and packaging details for every size.',
  Packaging: 'Boxes, sleeves, bags, pouches, and finished packaging systems.',
  Publishing: 'Books, catalogues, manuals, notebooks, and bound documents.',
  'Large format': 'Banners, displays, signage, and print that works from across the room.',
  Prepress: 'Reliable CTP and film output for commercial production.',
  'Industry bundles': 'Coordinated print collections for a specific business, ready to configure item by item.',
  Custom: 'A flexible starting point for unusual sizes, materials, or finishing.'
}

function money(value) { return Number(value) > 0 ? `${Math.round(Number(value)).toLocaleString()} ETB` : 'Custom quote' }

export function useSiteLanguage() {
  const [language, setLanguage] = useState(() => localStorage.getItem('maxrez-language') || 'en')
  useEffect(() => {
    const onLanguage = event => setLanguage(event.detail || localStorage.getItem('maxrez-language') || 'en')
    window.addEventListener('maxrez-language', onLanguage)
    return () => window.removeEventListener('maxrez-language', onLanguage)
  }, [])
  return language
}

export function ProductCatalog({ products = [], go, standalone = false }) {
  const [liveProducts, setLiveProducts] = useState(products)
  useEffect(() => { fetch(`${import.meta.env.VITE_API_URL || '/api'}/products`).then(response => response.ok ? response.json() : []).then(rows => { if (Array.isArray(rows) && rows.length) setLiveProducts(rows) }).catch(() => {}) }, [])
  const available = liveProducts.filter(product => product?.active !== false && product?.active !== 0)
  const categories = useMemo(() => categoryOrder.filter(category => available.some(product => product.category === category)), [available])
  const [category, setCategory] = useState('All')
  const filtered = category === 'All' ? available : available.filter(product => product.category === category)
  if (!standalone) return null
  return <section className="catalog-section" id="catalog">
    <div className="section-head catalog-head"><div><div className="eyebrow"><ShoppingBag size={15}/> THE MAXREZ CATALOG</div><h2>Print for the moment<br/><em>and the whole brand.</em></h2></div><p>Start with a focused product, or build a complete collection of labels, packaging, stationery, and marketing materials together.</p></div>
    <div className="catalog-filters" aria-label="Product categories"><button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>All products</button>{categories.map(item => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <div className="catalog-grid">{filtered.map(product => <article className="catalog-card" key={product.id || product.slug}><div className="catalog-icon"><Package size={20}/></div><div className="eyebrow">{product.category}</div><h3>{product.name.replace(/ package$/i, '')}</h3><p>{product.description || categoryCopy[product.category] || 'Made to your specification by the Maxrez team.'}</p><div className="catalog-meta"><strong>{money(product.base_price)}<small>{Number(product.base_price) > 0 ? ' starting point' : ''}</small></strong><span>From {product.minimum_quantity || 1} units</span></div><button className="text-link" onClick={() => go(`/order?product=${encodeURIComponent(product.slug)}`)}>Configure this <ChevronRight size={16}/></button></article>)}</div>
    <div className="catalog-foot"><span><Check size={16}/> Every estimate is reviewed before production</span><span><Check size={16}/> Custom sizes and materials welcome</span><button className="outline" onClick={() => go('/order?product=custom')}>Start a custom project</button></div>
  </section>
}

export function TrustSection({ go }) {
  return <section className="trust-section"><div className="trust-intro"><div className="eyebrow"><Sparkles size={15}/> WHY MAXREZ</div><h2>Good print is more<br/><em>than ink on paper.</em></h2><p>We help businesses turn ideas into finished brand touchpoints, with a real team checking the details along the way.</p><button className="text-link" onClick={() => go('/visit')}>Meet us in Addis <ChevronRight size={16}/></button></div><div className="trust-points"><article><Check/><h3>Human file review</h3><p>Your artwork is screened and our team flags anything that needs attention.</p></article><article><Check/><h3>Approve before print</h3><p>Final artwork and final pricing are confirmed with you before production begins.</p></article><article><Check/><h3>Pickup or delivery</h3><p>Collect from our facility or choose delivery across Addis Ababa.</p></article><article><Leaf/><h3>Print with intention</h3><p>Ask us about available recycled stocks and lower-waste choices for your project.</p></article></div></section>
}

export function LeadTools({ api }) {
  const [mode, setMode] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' })
  const [state, setState] = useState('idle')
  const submit = async event => {
    event.preventDefault(); setState('busy')
    try {
      const path = mode === 'samples' ? '/sample-requests' : '/design-briefs'
      await api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, note: mode === 'samples' ? `SAMPLE KIT REQUEST\n${form.note}` : form.note }) })
      setState('done')
    } catch (error) { setState(error.message) }
  }
  return <section className="lead-tools"><article className="sample-card"><div className="tool-icon"><Package/></div><div><div className="eyebrow">FEEL THE DIFFERENCE</div><h2>Request a Maxrez sample pack.</h2><p>See real papers, labels, stickers, finishes, and packaging examples before committing to a larger run.</p><button className="primary" onClick={() => { setMode('samples'); setState('idle') }}>Request a sample pack <ChevronRight size={17}/></button></div></article><article className="brief-card"><div className="tool-icon"><Palette/></div><div><div className="eyebrow">NEED DESIGN HELP?</div><h2>Send us the brief.</h2><p>Tell us what you are launching and attach your files from the order page. We’ll help shape the print system.</p><button className="outline" onClick={() => { setMode('brief'); setState('idle') }}>Start a design brief <MessageSquareText size={17}/></button></div></article>{mode&&<div className="tool-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setMode(null)}><form className="tool-modal" onSubmit={submit}><button type="button" className="tool-close" aria-label="Close" onClick={() => setMode(null)}><X/></button><div className="eyebrow">{mode === 'samples' ? 'SAMPLE PACK' : 'DESIGN BRIEF'}</div><h2>{mode === 'samples' ? 'Let’s send you the right materials.' : 'Give the Maxrez team a head start.'}</h2>{state === 'done' ? <div className="tool-success"><Check/><h3>Request received.</h3><p>We’ll follow up from the Maxrez team with the next step.</p><button type="button" className="primary" onClick={() => setMode(null)}>Done</button></div> : <><label>Name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label><label>Phone<input required value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })}/></label><label>Email <span className="optional">optional</span><input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label><label>{mode === 'samples' ? 'What are you printing?' : 'What are you trying to create?'}<textarea required value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder={mode === 'samples' ? 'Labels, packaging, menus, business cards…' : 'Tell us about your business, audience, sizes, and deadline…'}/></label>{typeof state === 'string' && state !== 'idle' && state !== 'busy' && <p className="error-text">{state}</p>}<button className="primary full" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : mode === 'samples' ? 'Request sample pack' : 'Send design brief'}</button></>}</form></div>}</section>
}

export function LanguageToggle() {
  const [language, setLanguage] = useState(() => localStorage.getItem('maxrez-language') || 'en')
  const toggle = () => { const next = language === 'en' ? 'am' : 'en'; setLanguage(next); localStorage.setItem('maxrez-language', next); document.documentElement.lang = next === 'am' ? 'am' : 'en'; window.dispatchEvent(new CustomEvent('maxrez-language', { detail: next })) }
  return <button className="language-toggle" onClick={toggle} aria-label="Change site language">{language === 'en' ? 'አማ' : 'EN'}</button>
}

export function SiteNotifications() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [read, setRead] = useState(() => { try { return JSON.parse(localStorage.getItem('maxrez-notification-read') || '[]') } catch { return [] } })
  const load = async () => {
    let local = []
    try { local = JSON.parse(localStorage.getItem('maxrez-local-notifications') || '[]') } catch {}
    const customer = (() => { try { return JSON.parse(localStorage.getItem('maxrez-customer') || 'null') } catch { return null } })()
    let remote = []
    if (customer?.token) { try { const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/customers/notifications`, { headers: { Authorization: `Bearer ${customer.token}` } }); if (response.ok) remote = await response.json() } catch {} }
    setItems([...local, ...remote].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 30))
  }
  useEffect(() => { load(); const onChange = () => load(); window.addEventListener('maxrez-notifications', onChange); window.addEventListener('storage', onChange); return () => { window.removeEventListener('maxrez-notifications', onChange); window.removeEventListener('storage', onChange) } }, [])
  const unread = items.filter(item => !read.includes(String(item.id || item.created_at))).length
  const markAll = () => { const ids = items.map(item => String(item.id || item.created_at)); const next = [...new Set([...read, ...ids])]; setRead(next); localStorage.setItem('maxrez-notification-read', JSON.stringify(next)) }
  return <div className="site-notifications"><button className="notification-button" aria-label={`Site notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => { setOpen(!open); if (!open) load() }}><Bell size={17}/>{unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}</button>{open&&<div className="notification-popover"><div className="notification-head"><div><strong>Site notifications</strong><small>Updates from your Maxrez jobs</small></div><button onClick={markAll} disabled={!unread}><Check size={15}/> Mark read</button></div>{items.length ? items.map(item => <div className={`notification-item ${read.includes(String(item.id || item.created_at)) ? '' : 'unread'}`} key={item.id || item.created_at}><span><b>{item.title || item.status?.replaceAll('_', ' ') || 'Maxrez update'}</b><small>{item.note || item.message || item.service || 'There is an update on your request.'}</small><time>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}</time></span></div>) : <div className="notification-empty"><Bell/><p>No updates yet. Order or send a file and we’ll keep the updates here.</p></div>}</div>}</div>
}
