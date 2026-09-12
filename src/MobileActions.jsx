import React,{useEffect,useState} from 'react'
import {FileUp,Phone,ShoppingBag} from 'lucide-react'
import { useSiteLanguage } from './StorefrontEnhancements.jsx'
export default function MobileActions({go,path,menu}) {
 const [typing,setTyping]=useState(false)
 const am=useSiteLanguage()==='am'
 useEffect(()=>{const update=()=>setTyping(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName));document.addEventListener('focusin',update);document.addEventListener('focusout',update);return()=>{document.removeEventListener('focusin',update);document.removeEventListener('focusout',update)}},[])
 if(typing||menu||['/order','/staff','/settings','/admin-accounts','/account'].includes(path)||path.startsWith('/track'))return null
 return <nav className="mobile-actions" aria-label="Quick actions"><button onClick={()=>go('/order')}><ShoppingBag size={19}/>{am?'ዘዙ':'Order'}</button><button onClick={()=>{go('/');setTimeout(()=>document.querySelector('.file-drop-section')?.scrollIntoView({behavior:'smooth'}),50)}}><FileUp size={19}/>{am?'ፋይሎች ይላኩ':'Send files'}</button><a href="tel:+251911207630"><Phone size={19}/>{am?'ይደውሉ':'Call'}</a></nav>
}
