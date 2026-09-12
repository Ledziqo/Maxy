import React, {useId} from 'react'
import {artworkKinds,previewDimensions,itemKind} from './print-preview-model.js'
import {packages} from './packages.js'
import './print-artwork.css'

const ink='#923643'
function Brand({x=180,y=169,width=170,subtitle='',foil=false}) {
  const size=Math.min(27,Math.max(12,width/5))
  return <g stroke="none" textAnchor="middle" fontFamily="Arial,sans-serif"><text x={x} y={y} fontSize={size} fontWeight="700" fill={foil?'#946e22':ink}>max<tspan fontWeight="400">rez</tspan></text>{subtitle&&<text x={x} y={y+22} fontSize={Math.min(12,width/12)} letterSpacing="1.5" fill="#74574f">{subtitle}</text>}</g>
}
export function ObjectDrawing({kind,w=180,h=226,shape='rectangle',finish='',depth=28}) {
  const x=(360-w)/2,y=(320-h)/2,d=Math.min(42,Math.max(10,depth)),foil=/foil/i.test(finish)
  const brand=<Brand width={w} foil={foil}/>
  const lines=<path d={`M${x+w*.17} ${y+h*.78}h${w*.66}m${-w*.66} 9h${w*.4}`} opacity=".3"/>
  const rect=<rect x={x} y={y} width={w} height={h} rx={shape==='rounded'||/round/i.test(finish)?12:2} fill="var(--art-paper)"/>
  const scaled=(children)=><g transform={`translate(${x} ${y}) scale(${w/180} ${h/226})`} style={{strokeWidth:2}}>{children}</g>
  if(kind==='box'||kind==='carton')return <><path d={`M${x} ${y+20}l${d}-20h${w}l${-d} 20Z`} fill="var(--art-edge)"/><path d={`M${x+w} ${y+20}l${d}-20v${h-20}l${-d} 20Z`} fill="var(--art-edge)"/><rect x={x} y={y+20} width={w} height={h-20} fill="var(--art-paper)"/><path d={`M${x+12} ${y+32}h${w-24}M${x+w*.45} ${y+20}h${w*.1}`} opacity=".4"/>{brand}{lines}</>
  if(kind==='takeaway')return <><path d="M57 110l55-42h188l-45 42Z" fill="var(--art-edge)"/><path d="M57 110h198l-20 100H82Z" fill="var(--art-paper)"/><path d="M255 110l45-42-22 106-43 36Z" fill="var(--art-edge)"/><path d="M142 111v16h31v-16" fill="var(--art-edge)"/><Brand width={180}/></>
  if(kind==='bag')return <>{scaled(<><path d="M40 22V0c0-51 100-51 100 0v22" fill="none" strokeWidth="4"/><path d="M0 22h180l-9 204H9Z" fill="var(--art-paper)"/><path d={`M${180-d/2} 22v185l${d/2-9} 19M9 226l18-19h${153-d/2}`} opacity=".4"/></>)}{brand}{lines}</>
  if(kind==='pouch')return <>{scaled(<><path d="M0 0h180l-8 210q-82 32-164 0Z" fill="var(--art-paper)"/><path d="M0 14h180M7 26h166M8 210q82-24 164 0"/><path d="M0 8h8m164 0h8" strokeWidth="5"/></>)}{brand}{lines}</>
  if(kind==='bottle')return <><path d="M150 55V34h60v21M158 34V20h63m-29 0v14" fill="var(--art-edge)"/><rect x="125" y="55" width="110" height="220" rx="23" fill="var(--art-paper)"/><rect x="126" y="113" width="108" height="100" rx="2" fill="#fffaf2"/><Brand width={105} subtitle="SHAMPOO"/></>
  if(kind==='jar')return <><rect x="78" y="110" width="204" height="128" rx="24" fill="var(--art-paper)"/><rect x="75" y="88" width="210" height="38" rx="8" fill="var(--art-edge)"/><path d="M92 100h176M87 215h186" opacity=".4"/><Brand subtitle="HAIR FOOD"/></>
  if(kind==='roll')return <><ellipse cx="90" cy="157" rx="44" ry="90" fill="var(--art-edge)"/><path d="M90 67h192v180H90" fill="var(--art-paper)"/><ellipse cx="90" cy="157" rx="29" ry="66" fill="#f2e7da"/><ellipse cx="90" cy="157" rx="13" ry="34" fill="#dcc8b5"/><g transform={`translate(195 157) scale(${Math.min(120,w)/180} ${Math.min(134,h)/226}) translate(-180 -160)`}><ObjectDrawing kind="label" w={180} h={226} shape={shape}/></g><path d="M285 67v180" strokeDasharray="3 5" opacity=".5"/></>
  if(kind==='tag'||kind==='badge')return <>{scaled(<><path d="M90 6Q40-54 74-30" fill="none"/><path d="M28 0h124l28 34v192H0V34Z" fill="var(--art-paper)"/><circle cx="90" cy="22" r="6" fill="#f3e8da"/></>)}<Brand width={w} subtitle={kind==='badge'?'GUEST':''}/>{lines}</>
  if(kind==='seal'||(kind==='label'&&shape==='circle'))return <><circle cx="180" cy="160" r="106" fill="var(--art-paper)"/><circle cx="180" cy="160" r="94" fill="none" strokeDasharray="3 6" opacity=".4"/>{brand}</>
  if(kind==='label'&&shape==='custom')return <><path d="M98 64h163l-13 38 27 23-14 43 13 44-33 12-8 33H98l12-45-24-21 9-48-14-37Z" fill="var(--art-paper)" strokeDasharray="5 4"/>{brand}<text x="180" y="209" textAnchor="middle" fontSize="12" stroke="none" fill="#74574f">CUSTOM CUT</text></>
  if(kind==='fold')return <>{scaled(<><path d="M-12 0l68 15L124 0l68 15v211l-68-15-68 15-68-15Z" fill="var(--art-paper)"/><path d="M56 15v211M124 0v211" strokeDasharray="4 4" opacity=".45"/><path d="M3 53h37M3 66h37M72 67h36m-36 13h36M137 153h39m-39 13h39" opacity=".4"/></>)}<Brand x={x+w*.88} y={160} width={w*.45}/></>
  const bound=['book','catalogue','manual','profile','report'].includes(kind)
  const title={book:'BOOK',catalogue:'CATALOGUE',manual:'MANUAL',profile:'COMPANY PROFILE',report:'REPORT',notebook:'NOTEBOOK',menu:'MENU',certificate:'CERTIFICATE'}[kind]
  return <>{(kind==='card'||kind==='loyalty'||bound)&&<rect x={x+8} y={y+8} width={w} height={h} rx="3" fill="var(--art-edge)"/>}{rect}
    {bound&&<><path d={`M${x+14} ${y}v${h}M${x+14} ${y+h+4}h${w-10}`} opacity=".65"/>{kind==='catalogue'&&<path d={`M${x+w*.2} ${y+h*.64}h${w*.24}v${h*.2}h${-w*.24}Z m${w*.36} 0h${w*.24}v${h*.2}h${-w*.24}Z`} fill="var(--art-edge)"/>}</>}
    {kind==='notebook'&&Array.from({length:9},(_,i)=><path key={i} d={`M${x-6} ${y+18+i*(h-36)/8}h17`} strokeWidth="4"/>)}
    {kind==='banner'&&<><path d={`M180 ${y+h}v22M${x-6} ${y+h+22}h${w+12}`} strokeWidth="5"/><path d={`M${x+15} ${y+h+22}l-10 9m${w-20}-9 10 9`}/></>}
    {kind==='plate'&&<><path d={`M${x+8} ${y+12}h${w-16}`} strokeDasharray="3 8"/><path d={`M${x+12} ${y+24}h14m-7-7v14M${x+w-26} ${y+h-24}h14m-7-7v14`}/><text x="180" y={y+43} stroke="none" textAnchor="middle" fontSize="12">CTP PLATE</text></>}
    {kind==='film'&&<><path d={`M${x+10} ${y+10}h${w-20}v${h-20}h${20-w}Z`} strokeDasharray="7 5"/><Brand width={w} subtitle="FILM POSITIVE"/><path d={`M${x+22} ${y+h-34}h${w-44}v12h${44-w}Z`} fill="#3c3030"/></>}
    {kind==='folder'&&<path d={`M${x} ${y+h*.64}l${w*.5} 20 ${w*.5}-20v${h*.36}h${-w}Z`} fill="var(--art-edge)"/>}
    {kind==='certificate'&&<><rect x={x+12} y={y+12} width={w-24} height={h-24} fill="none" opacity=".5"/><circle cx="180" cy={y+h*.77} r="12" fill="var(--art-edge)"/><path d={`M174 ${y+h*.77+10}l-3 17 9-4 9 4-3-17`}/></>}
    {title&&<text x="180" y={y+34} textAnchor="middle" fontFamily="Arial" fontSize={Math.min(14,w/14)} letterSpacing="2" stroke="none" fill="#74574f">{title}</text>}
    {kind!=='film'&&brand}
    {kind==='loyalty'?Array.from({length:5},(_,i)=><circle key={i} cx={x+w*.17+i*w*.165} cy={y+h*.78} r="7" fill="none"/>):!['catalogue','certificate','film'].includes(kind)&&lines}
    {kind==='label'&&<path d={`M${x+w-25} ${y+h}l25-25v25Z`} fill="var(--art-edge)"/>}
  </>
}
export default function PrintArtwork({slug,form={},rules={},am=false}) {
  const id=useId().replaceAll(':',''),kind=artworkKinds[slug]||'sheet'
  const fallback=packages.find(p=>p.slug===slug.replace('package-','')||(slug==='restaurant-print'&&p.slug==='restaurants'))
  const collection=rules.packageItems||fallback?.packageItems
  const [width,height]=previewDimensions(slug,form)
  const ratio=Math.max(.28,Math.min(3.8,width/height)),h=Math.min(220,238/ratio),w=h*ratio
  const material=rules.materials?.find(i=>i.value===form.material)?.label||'',finish=rules.finishes?.find(i=>i.value===form.finish)?.label||form.finish||''
  const paper=/kraft/i.test(material)?'#cba779':/clear/i.test(material)?'#ffffff66':/luxury|premium/i.test(material)?'#eee0c7':kind==='plate'?'#d8dfe2':'#fffaf2'
  const depth=Math.min(42,Math.max(10,(Number(form.printDepth)||60)/width*w*.4))
  return <div className="print-artwork" style={{'--art-paper':paper,'--art-edge':/kraft/i.test(material)?'#a47c52':'#e3d1bd','--art-line':ink}}>
    {collection?<><div className="print-collection">{collection.map((item,index)=>{
      const type=itemKind(item.name),quantity=Number(form.packageQuantities?.[item.id]??item.quantity)
      const wide=['card','loyalty','certificate','takeaway','jar'].includes(type)
      return <figure key={item.id||index} className={quantity===0?'print-item-excluded':''}><svg viewBox="0 0 360 320" role="img" aria-label={item.name}><g stroke={ink} strokeWidth="2" strokeLinejoin="round"><ObjectDrawing kind={type} w={wide?236:type==='carton'?100:174} h={wide?142:220}/></g></svg><figcaption>{item.name}<small>{quantity===0?(am?'አልተካተተም':'Not included'):`${quantity} ${am?'ክፍሎች':'units'}`}</small></figcaption></figure>
    })}</div>{collection.some(i=>/shampoo|hair.food/i.test(i.name))&&<p className="print-context-note">{am?'ጠርሙሶችና ማሰሮዎች የመለያ አቀማመጥን ለማሳየት ብቻ ናቸው።':'Bottles and jars show label placement; containers are not included.'}</p>}</>:<>
      <svg viewBox="0 0 360 350" role="img" aria-label={`${slug}: ${width} by ${height} mm, ${material}, ${finish}`}><defs><linearGradient id={id}><stop stopColor="white" stopOpacity="0"/><stop offset=".5" stopColor="white" stopOpacity=".65"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient></defs><g stroke={ink} strokeWidth="2" strokeLinejoin="round"><ObjectDrawing kind={kind} w={w} h={h} shape={form.printShape} finish={finish} depth={depth}/></g>{/gloss/i.test(finish)&&<path d="M140 70h38l60 190h-38Z" fill={`url(#${id})`} pointerEvents="none"/>}<text x="180" y="336" textAnchor="middle" fontFamily="Arial" fontSize="14" fill="#73625b">{width} × {height} mm</text></svg>
      <div className="print-selection">{[material,finish].filter(Boolean).join(' · ')}</div>
    </>}
    <small className="print-preview-note">{am?'ማሳያ ስዕል · የመጨረሻው ዲዛይን ከህትመት በፊት ይጸድቃል':'Illustrative preview · Final artwork approved before printing'}</small>
  </div>
}
