import React, { useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'

export default function PublicHeader({ go, menu, setMenu }) {
  const toggle = useRef(null)
  const open = path => { go(path); setMenu(false) }
  useEffect(() => {
    const escape = event => { if(event.key === 'Escape' && menu){setMenu(false);toggle.current?.focus()} }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [menu, setMenu])
  return <header className={`nav ${menu ? 'nav-open' : ''}`}>
    <button className="brand brand-button" onClick={() => open('/')} aria-label="Maxrez home" />
    <nav id="public-navigation" aria-label="Main navigation">
      <button onClick={() => open('/order')}>Order & price</button>
      <button onClick={() => { open('/'); requestAnimationFrame(() => document.getElementById('services')?.scrollIntoView({behavior:'smooth'})) }}>Services</button>
      <button onClick={() => open('/work')}>Our work</button>
      <button onClick={() => open('/visit')}>Visit us</button>
      <button onClick={() => open('/track')}>Track an order</button>
      <button onClick={() => open('/account')}>My jobs</button>
      <button className="mobile-staff" onClick={() => open('/staff')}>Staff login</button>
    </nav>
    <div className="nav-actions">
      <button className="outline desktop-staff" onClick={() => open('/staff')}>Staff login</button>
      <button ref={toggle} className="menu" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} aria-controls="public-navigation" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
    </div>
  </header>
}
