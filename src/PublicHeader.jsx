import React from 'react'
import { Menu, X } from 'lucide-react'

export default function PublicHeader({ go, menu, setMenu }) {
  const open = path => { go(path); setMenu(false) }
  return <header className={`nav ${menu ? 'nav-open' : ''}`}><button className="brand brand-button" onClick={() => open('/')} aria-label="Maxrez home"><span className="brand-mark">M</span><span>MAXREZ<small>GRAPHICS & PRINTING</small></span></button><nav><button onClick={() => open('/order')}>Order & price</button><button onClick={() => { open('/'); setTimeout(() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }), 30) }}>Services</button><button onClick={() => open('/work')}>Our work</button><button onClick={() => open('/visit')}>Visit us</button><button onClick={() => open('/track')}>Track an order</button><button className="mobile-staff" onClick={() => open('/staff')}>Staff login</button></nav><div className="nav-actions"><button className="outline desktop-staff" onClick={() => open('/staff')}>Staff login</button><button className="menu" aria-label="Toggle navigation" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></div></header>
}
