import React, { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { LanguageToggle, SiteNotifications } from './StorefrontEnhancements.jsx'

export default function PublicHeader({ go, menu, setMenu }) {
  const toggle = useRef(null)
  const [language, setLanguage] = useState(() => localStorage.getItem('maxrez-language') || 'en')
  const open = path => { go(path); setMenu(false) }
  useEffect(() => {
    const escape = event => { if(event.key === 'Escape' && menu){setMenu(false);toggle.current?.focus()} }
    const changeLanguage = event => setLanguage(event.detail || localStorage.getItem('maxrez-language') || 'en')
    document.addEventListener('keydown', escape)
    window.addEventListener('maxrez-language', changeLanguage)
    return () => { document.removeEventListener('keydown', escape); window.removeEventListener('maxrez-language', changeLanguage) }
  }, [menu, setMenu])
  const labels = language === 'am' ? { order:'ትዕዛዝ እና ዋጋ', catalog:'ካታሎግ', services:'አገልግሎቶች', work:'ስራዎቻችን', visit:'ይጎብኙን', track:'ትዕዛዝ ይከታተሉ', staff:'የሰራተኛ መግቢያ' } : { order:'Order & price', catalog:'Catalog', services:'Services', work:'Our work', visit:'Visit us', track:'Track an order', staff:'Staff login' }
  return <header className={`nav ${menu ? 'nav-open' : ''}`}>
    <button className="brand brand-button" onClick={() => open('/')} aria-label="Maxrez home" />
    <nav id="public-navigation" aria-label="Main navigation">
      <button onClick={() => open('/order')}>{labels.order}</button>
      <button onClick={() => open('/catalog')}>{labels.catalog}</button>
      <button onClick={() => { open('/'); requestAnimationFrame(() => document.getElementById('services')?.scrollIntoView({behavior:'smooth'})) }}>{labels.services}</button>
      <button onClick={() => open('/work')}>{labels.work}</button>
      <button onClick={() => open('/visit')}>{labels.visit}</button>
      <button onClick={() => open('/track')}>{labels.track}</button>
      <button className="mobile-staff" onClick={() => open('/staff')}>{labels.staff}</button>
    </nav>
    <div className="nav-actions">
      <LanguageToggle />
      <SiteNotifications />
      <button className="outline desktop-staff" onClick={() => open('/staff')}>{labels.staff}</button>
      <button ref={toggle} className="menu" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} aria-controls="public-navigation" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
    </div>
  </header>
}
