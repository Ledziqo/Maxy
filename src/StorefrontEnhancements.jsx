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
  const am = useSiteLanguage() === 'am'
  const available = liveProducts.filter(product => product?.active !== false && product?.active !== 0)
  const categories = useMemo(() => categoryOrder.filter(category => available.some(product => product.category === category)), [available])
  const categoryLabels = am ? { 'Cards & stationery':'ካርዶች እና የጽሕፈት ውጤቶች','Marketing print':'የግብይት ህትመት',Labels:'መለያዎች',Packaging:'ማሸጊያ',Publishing:'ህትመት እና መጽሐፍት','Large format':'ትልቅ ቅርጸት',Prepress:'ቅድመ ህትመት','Industry bundles':'የኢንዱስትሪ ጥቅሎች',Custom:'ብጁ'} : {}
  const [category, setCategory] = useState('All')
  const filtered = category === 'All' ? available : available.filter(product => product.category === category)
  if (!standalone) return null
  return <section className="catalog-section" id="catalog">
    <div className="section-head catalog-head"><div><div className="eyebrow"><ShoppingBag size={15}/> {am?'የMAXREZ ካታሎግ':'THE MAXREZ CATALOG'}</div><h2>{am?'ለዛሬ ያትሙ':'Print for the moment'}<br/><em>{am?'ለሙሉ ብራንድዎ።':'and the whole brand.'}</em></h2></div><p>{am?'ከአንድ ምርት ይጀምሩ ወይም መለያዎችን፣ ማሸጊያዎችን፣ የጽሕፈት ውጤቶችን እና የግብይት ህትመቶችን በአንድ ስብስብ ይገንቡ።':'Start with a focused product, or build a complete collection of labels, packaging, stationery, and marketing materials together.'}</p></div>
    <div className="catalog-filters" aria-label="Product categories"><button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>{am?'ሁሉም ምርቶች':'All products'}</button>{categories.map(item => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{categoryLabels[item] || item}</button>)}</div>
    <div className="catalog-grid">{filtered.map(product => <article className="catalog-card" key={product.id || product.slug}><div className="catalog-icon"><Package size={20}/></div><div className="eyebrow">{categoryLabels[product.category] || product.category}</div><h3>{product.name.replace(/ package$/i, '')}</h3><p>{product.description || categoryCopy[product.category] || (am?'በMaxrez ቡድን እንደ ፍላጎትዎ የተዘጋጀ።':'Made to your specification by the Maxrez team.')}</p><div className="catalog-meta"><strong>{money(product.base_price)}<small>{Number(product.base_price) > 0 ? (am?'መነሻ ዋጋ':'starting point') : ''}</small></strong><span>{am?'ከ':'From'} {product.minimum_quantity || 1} {am?'ክፍሎች':'units'}</span></div><button className="text-link" onClick={() => go(`/order?product=${encodeURIComponent(product.slug)}`)}>{am?'ይህን ያዘጋጁ':'Configure this'} <ChevronRight size={16}/></button></article>)}</div>
    <div className="catalog-foot"><span><Check size={16}/> {am?'እያንዳንዱ ግምት ከምርት በፊት ይመረመራል':'Every estimate is reviewed before production'}</span><span><Check size={16}/> {am?'ብጁ መጠንና ቁሳቁስ ይቻላል':'Custom sizes and materials welcome'}</span><button className="outline" onClick={() => go('/order?product=custom')}>{am?'ብጁ ፕሮጀክት ይጀምሩ':'Start a custom project'}</button></div>
  </section>
}

export function TrustSection({ go }) {
  const am = useSiteLanguage() === 'am'
  const points = am ? [['የሰው ፋይል ምርመራ','ስዕልዎ ይመረመራል፣ ትኩረት የሚፈልግ ነገር ካለ ቡድናችን ያሳውቅዎታል።'],['ከህትመት በፊት ያጽድቁ','የመጨረሻ ስዕልና ዋጋ ከምርት በፊት ከእርስዎ ጋር ይረጋገጣል።'],['መሰብሰብ ወይም ማድረስ','ከቦታችን ይሰብስቡ ወይም በአዲስ አበባ ማድረስን ይምረጡ።'],['በአላማ ይታተሙ','ስለ እንደገና ጥቅም ላይ ስለሚውሉ ወረቀቶችና ብክነትን ስለሚቀንሱ አማራጮች ይጠይቁ።']] : [['Human file review','Your artwork is screened and our team flags anything that needs attention.'],['Approve before print','Final artwork and final pricing are confirmed with you before production begins.'],['Pickup or delivery','Collect from our facility or choose delivery across Addis Ababa.'],['Print with intention','Ask us about available recycled stocks and lower-waste choices for your project.']]
  return <section className="trust-section"><div className="trust-intro"><div className="eyebrow"><Sparkles size={15}/> {am?'ለምን MAXREZ':'WHY MAXREZ'}</div><h2>{am?'ጥሩ ህትመት ከወረቀት':'Good print is more'}<br/><em>{am?'በላይ ነው።':'than ink on paper.'}</em></h2><p>{am?'ንግዶች ሀሳባቸውን ወደ የተጠናቀቁ የብራንድ ንክኪዎች እንዲቀይሩ እንረዳለን፣ በመንገዱም ቡድናችን ዝርዝሩን ይመረምራል።':'We help businesses turn ideas into finished brand touchpoints, with a real team checking the details along the way.'}</p><button className="text-link" onClick={() => go('/visit')}>{am?'በአዲስ አበባ ያግኙን':'Meet us in Addis'} <ChevronRight size={16}/></button></div><div className="trust-points">{points.map(([title,detail],index)=><article key={title}>{index===3?<Leaf/>:<Check/>}<h3>{title}</h3><p>{detail}</p></article>)}</div></section>
}

export function LeadTools({ api }) {
  const am = useSiteLanguage() === 'am'
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
  const copy = am ? { sampleEyebrow:'ልዩነቱን ይሰማዎት',sampleTitle:'የMaxrez ናሙና ጥቅል ይጠይቁ።',sampleText:'ትልቅ ስራ ከመጀመርዎ በፊት እውነተኛ ወረቀቶችን፣ መለያዎችን፣ ተለጣፊዎችን፣ ማጠናቀቂያዎችን እና ማሸጊያዎችን ይመልከቱ።',sampleButton:'ናሙና ይጠይቁ',briefEyebrow:'የዲዛይን እርዳታ ይፈልጋሉ?',briefTitle:'ሀሳቡን ይላኩልን።',briefText:'ምን እንደሚጀምሩ ይንገሩንና ፋይሎችዎን ከትዕዛዝ ገጹ ያያይዙ።',briefButton:'የዲዛይን ጥያቄ ይጀምሩ',sampleModal:'ትክክለኛውን ቁሳቁስ እንላክልዎ።',briefModal:'የMaxrez ቡድን ይጀምር።',received:'ጥያቄዎ ደርሷል።',follow:'ቡድናችን ቀጣዩን እርምጃ በቅርቡ ያሳውቅዎታል።',done:'ተጠናቋል',name:'ስም',phone:'ስልክ',email:'ኢሜይል',optional:'አማራጭ',whatPrint:'ምን እያተሙ ነው?',whatCreate:'ምን መፍጠር ይፈልጋሉ?',placeholderPrint:'መለያዎች፣ ማሸጊያዎች፣ ሜኑዎች፣ የንግድ ካርዶች…',placeholderBrief:'ስለ ንግድዎ፣ ደንበኞችዎ፣ መጠንዎችዎ እና ቀነ ገደብዎ ይንገሩን።',sending:'በመላክ ላይ…',sendBrief:'የዲዛይን ጥያቄ ይላኩ'} : { sampleEyebrow:'FEEL THE DIFFERENCE',sampleTitle:'Request a Maxrez sample pack.',sampleText:'See real papers, labels, stickers, finishes, and packaging examples before committing to a larger run.',sampleButton:'Request a sample pack',briefEyebrow:'NEED DESIGN HELP?',briefTitle:'Send us the brief.',briefText:'Tell us what you are launching and attach your files from the order page. We’ll help shape the print system.',briefButton:'Start a design brief',sampleModal:'Let’s send you the right materials.',briefModal:'Give the Maxrez team a head start.',received:'Request received.',follow:'We’ll follow up from the Maxrez team with the next step.',done:'Done',name:'Name',phone:'Phone',email:'Email',optional:'optional',whatPrint:'What are you printing?',whatCreate:'What are you trying to create?',placeholderPrint:'Labels, packaging, menus, business cards…',placeholderBrief:'Tell us about your business, audience, sizes, and deadline…',sending:'Sending…',sendBrief:'Send design brief'}
  return <section className="lead-tools"><article className="sample-card"><div className="tool-icon"><Package/></div><div><div className="eyebrow">{copy.sampleEyebrow}</div><h2>{copy.sampleTitle}</h2><p>{copy.sampleText}</p><button className="primary" onClick={() => { setMode('samples'); setState('idle') }}>{copy.sampleButton} <ChevronRight size={17}/></button></div></article><article className="brief-card"><div className="tool-icon"><Palette/></div><div><div className="eyebrow">{copy.briefEyebrow}</div><h2>{copy.briefTitle}</h2><p>{copy.briefText}</p><button className="outline" onClick={() => { setMode('brief'); setState('idle') }}>{copy.briefButton} <MessageSquareText size={17}/></button></div></article>{mode&&<div className="tool-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setMode(null)}><form className="tool-modal" onSubmit={submit}><button type="button" className="tool-close" aria-label="Close" onClick={() => setMode(null)}><X/></button><div className="eyebrow">{mode === 'samples' ? (am?'ናሙና ጥቅል':'SAMPLE PACK') : (am?'የዲዛይን ጥያቄ':'DESIGN BRIEF')}</div><h2>{mode === 'samples' ? copy.sampleModal : copy.briefModal}</h2>{state === 'done' ? <div className="tool-success"><Check/><h3>{copy.received}</h3><p>{copy.follow}</p><button type="button" className="primary" onClick={() => setMode(null)}>{copy.done}</button></div> : <><label>{copy.name}<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label><label>{copy.phone}<input required value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })}/></label><label>{copy.email} <span className="optional">{copy.optional}</span><input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label><label>{mode === 'samples' ? copy.whatPrint : copy.whatCreate}<textarea required value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder={mode === 'samples' ? copy.placeholderPrint : copy.placeholderBrief}/></label>{typeof state === 'string' && state !== 'idle' && state !== 'busy' && <p className="error-text">{state}</p>}<button className="primary full" disabled={state === 'busy'}>{state === 'busy' ? copy.sending : mode === 'samples' ? copy.sampleButton : copy.sendBrief}</button></>}</form></div>}</section>
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
