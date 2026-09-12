import React, { useEffect } from 'react'

const RED = '#932331'
const ROSE = '#d99c8a'
const PAPER = '#fffaf3'
const PEACH = '#f3d8c5'

function Logo({ x = 140, y = 95, size = 18 }) {
  return <text x={x} y={y} textAnchor="middle" fill={RED} fontSize={size} fontWeight="700">maxrez</text>
}

function Outline({ type, shape }) {
  const labelRadius = shape === 'circle' ? 54 : shape === 'rounded' ? 15 : 3
  if (type === 'business-cards') return <g fill="none" stroke={RED} strokeWidth="2"><rect x="34" y="56" width="166" height="78" rx="7" fill={PEACH}/><rect x="79" y="38" width="166" height="78" rx="7" fill={PAPER}/><path d="M99 59h54M99 70h36" stroke={ROSE}/><Logo x="180" y="94" size="21"/></g>
  if (type === 'brochures') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M36 47l67-15 70 15v98l-70-15-67 15z" fill={PAPER}/><path d="M103 32v98M173 47v98"/><path d="M54 63h35M54 75h42M119 54h37M119 66h39M119 78h29" stroke={ROSE}/><Logo x="137" y="116" size="18"/></g>
  if (type === 'labels') return <g fill="none" stroke={RED} strokeWidth="2"><rect x="34" y="41" width="65" height="43" rx={labelRadius} fill={PAPER}/><rect x="108" y="41" width="65" height="43" rx={labelRadius} fill={PEACH}/><rect x="182" y="41" width="65" height="43" rx={labelRadius} fill={PAPER}/><rect x="34" y="96" width="65" height="43" rx={labelRadius} fill={PEACH}/><rect x="108" y="96" width="65" height="43" rx={labelRadius} fill={PAPER}/><rect x="182" y="96" width="65" height="43" rx={labelRadius} fill={PEACH}/><Logo x="66" y="68" size="10"/><Logo x="140" y="68" size="10"/><Logo x="214" y="68" size="10"/><Logo x="66" y="123" size="10"/><Logo x="140" y="123" size="10"/><Logo x="214" y="123" size="10"/></g>
  if (type === 'books') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M42 42h73c9 0 15 6 15 15v89H58c-9 0-16-7-16-16z" fill={PAPER}/><path d="M100 42h73c9 0 15 6 15 15v89h-72c-9 0-16-7-16-16z" fill={PEACH}/><path d="M100 42v88M57 66h38M57 80h31M116 66h38M116 80h29" stroke={ROSE}/><Logo x="78" y="123" size="15"/><Logo x="139" y="123" size="15"/></g>
  if (type === 'packaging') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M42 67l85-30 111 34-85 31z" fill={PEACH}/><path d="M42 67v61l111 35v-61z" fill="#d99c8a"/><path d="M153 102l85-31v61l-85 31z" fill={PAPER}/><path d="M80 54l42-15 30 9-42 15z" stroke={ROSE}/><Logo x="193" y="121" size="17"/></g>
  if (type === 'restaurant-print') return <g fill="none" stroke={RED} strokeWidth="2"><rect x="28" y="39" width="71" height="106" rx="3" fill={PAPER}/><path d="M42 59h42M42 71h33M42 83h39" stroke={ROSE}/><Logo x="63" y="119" size="13"/><path d="M119 70l46-15 43 18-46 16z" fill={PEACH}/><path d="M119 70v44l43 18V89z" fill="#d99c8a"/><path d="M162 89l46-16v44l-46 15z" fill={PAPER}/><Logo x="177" y="108" size="9"/><path d="M224 58h38l-5 74h-28z" fill={PAPER}/><path d="M231 58c0-19 24-19 24 0"/><Logo x="243" y="101" size="7"/><rect x="102" y="31" width="38" height="20" rx="2" fill={PAPER}/><Logo x="121" y="45" size="8"/></g>
  if (type === 'large-format') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M55 35h170v87H55z" fill={PAPER}/><path d="M75 53h130M75 68h83" stroke={ROSE}/><Logo x="140" y="101" size="26"/><path d="M72 122v34M208 122v34M61 156h22M197 156h22"/></g>
  if (type === 'custom') return <g fill="none" stroke={RED} strokeWidth="2"><rect x="48" y="34" width="184" height="112" rx="8" fill={PAPER}/><circle cx="91" cy="74" r="20" fill={PEACH}/><path d="M126 56h75M126 70h55M70 113h132" stroke={ROSE}/><Logo x="140" y="101" size="23"/><path d="M207 28l16 16M223 28l-16 16"/></g>
  if (type === 'ctp-plates') return <g fill="none" stroke={RED} strokeWidth="2"><rect x="40" y="29" width="200" height="124" rx="4" fill="#dce9e7"/><circle cx="64" cy="52" r="8"/><circle cx="216" cy="52" r="8"/><circle cx="64" cy="130" r="8"/><circle cx="216" cy="130" r="8"/><path d="M90 57h91M90 72h72M90 87h82M90 102h58" stroke={ROSE}/><Logo x="140" y="128" size="20"/></g>
  if (type === 'film-output') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M54 31h172v120H54z" fill="#dfe9e7"/><path d="M54 44h172M54 138h172"/><path d="M61 31v13M75 31v13M89 31v13M103 31v13M117 31v13M131 31v13M145 31v13M159 31v13M173 31v13M187 31v13M201 31v13M215 31v13M61 138v13M75 138v13M89 138v13M103 138v13M117 138v13M131 138v13M145 138v13M159 138v13M173 138v13M187 138v13M201 138v13M215 138v13"/><path d="M82 69h116M82 84h86M82 99h103" stroke={ROSE}/><Logo x="140" y="126" size="18"/></g>
  if (type === 'packaging-labels') return <g fill="none" stroke={RED} strokeWidth="2"><circle cx="86" cy="94" r="43" fill={PEACH}/><circle cx="86" cy="94" r="22" fill={PAPER}/><path d="M86 51v86M43 94h86" stroke={ROSE}/><path d="M154 49h76v91h-76z" fill={PAPER}/><path d="M169 70h47M169 84h38" stroke={ROSE}/><Logo x="192" y="116" size="15"/></g>
  if (type === 'cosmetic-cartons') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M41 55l61-19 34 13-61 19z" fill={PEACH}/><path d="M41 55v83l34 17V68z" fill="#d99c8a"/><path d="M75 68l61-19v83l-61 23z" fill={PAPER}/><Logo x="105" y="112" size="13"/><path d="M170 66h45l-4 75h-37z" fill={PAPER}/><path d="M179 66V51h27v15M185 45h15"/><Logo x="192" y="111" size="10"/></g>
  if (type === 'pouches') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M64 48h153l-11 99H75z" fill={PAPER}/><path d="M64 48h153M80 63h121"/><path d="M81 42h119" stroke={ROSE}/><path d="M91 34h99"/><Logo x="140" y="108" size="25"/><path d="M94 123h92" stroke={ROSE}/></g>
  if (type === 'paper-bags') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M61 52h158l-11 93H72z" fill={PAPER}/><path d="M92 52c0-32 96-32 96 0M106 52c0-21 68-21 68 0"/><path d="M76 76h128" stroke={ROSE}/><Logo x="140" y="116" size="24"/></g>
  if (type === 'menus') return <g fill="none" stroke={RED} strokeWidth="2"><rect x="64" y="25" width="152" height="130" rx="3" fill={PAPER}/><path d="M82 52h116M82 67h98M82 82h106M82 111h71" stroke={ROSE}/><circle cx="140" cy="99" r="12" fill={PEACH}/><Logo x="140" y="137" size="21"/></g>
  if (type === 'hang-tags') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M57 46h108l57 57-74 52-91-91z" fill={PAPER}/><circle cx="91" cy="77" r="9" fill={PEACH}/><path d="M98 53c18-26 41-26 55-8"/><Logo x="145" y="111" size="18"/></g>
  if (type === 'notebooks') return <g fill="none" stroke={RED} strokeWidth="2"><rect x="64" y="28" width="145" height="126" rx="4" fill={PAPER}/><path d="M84 28v126M101 56h83M101 71h68M101 86h76M101 101h53" stroke={ROSE}/><path d="M57 43h12M57 62h12M57 81h12M57 100h12M57 119h12M57 138h12"/><Logo x="153" y="130" size="18"/></g>
  if (type === 'package-restaurants') return <Outline type="restaurant-print" shape={shape}/>
  if (type === 'package-corporate') return <g fill="none" stroke={RED} strokeWidth="2"><rect x="28" y="45" width="94" height="104" rx="3" fill={PAPER}/><path d="M44 64h61M44 78h49M44 92h54" stroke={ROSE}/><Logo x="75" y="127" size="14"/><rect x="144" y="63" width="106" height="67" rx="6" fill={PEACH}/><path d="M144 81h106"/><Logo x="197" y="111" size="15"/><rect x="159" y="30" width="74" height="27" rx="3" fill={PAPER}/><Logo x="196" y="48" size="10"/></g>
  if (type === 'package-retail') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M27 70l62-21 49 24-62 22z" fill={PEACH}/><path d="M27 70v53l49 21V95z" fill="#d99c8a"/><path d="M76 95l62-22v53l-62 18z" fill={PAPER}/><Logo x="106" y="120" size="13"/><path d="M172 54h69l-7 93h-55z" fill={PAPER}/><path d="M189 54c0-26 35-26 35 0"/><Logo x="206" y="112" size="14"/></g>
  if (type === 'package-publishing') return <g fill="none" stroke={RED} strokeWidth="2"><path d="M27 47h80c9 0 15 6 15 15v91H45c-10 0-18-8-18-18z" fill={PAPER}/><path d="M45 47v90M59 68h47M59 82h38" stroke={ROSE}/><Logo x="83" y="124" size="13"/><path d="M143 57h88v94h-88z" fill={PEACH}/><path d="M158 79h55M158 93h44M158 107h50" stroke={ROSE}/><Logo x="187" y="135" size="13"/></g>
  if (type === 'package-cosmetics') return <Outline type="cosmetic-cartons" shape={shape}/>
  if (type === 'package-events') return <g fill="none" stroke={RED} strokeWidth="2"><rect x="27" y="52" width="92" height="82" rx="3" fill={PAPER}/><path d="M45 71h57M45 84h44" stroke={ROSE}/><Logo x="74" y="113" size="13"/><path d="M145 38h105v62H145z" fill={PEACH}/><path d="M158 55h75M158 69h55" stroke={ROSE}/><path d="M165 100v44M230 100v44M156 144h25M217 144h25"/><circle cx="131" cy="126" r="18" fill={PAPER}/><Logo x="131" y="130" size="8"/></g>
  return <g fill="none" stroke={RED} strokeWidth="2"><rect x="70" y="27" width="140" height="126" rx="3" fill={PAPER}/><path d="M88 52h104M88 67h77M88 82h92" stroke={ROSE}/><Logo x="140" y="124" size="25"/></g>
}

const typeFor = {
  'business-cards': 'business-cards', brochures: 'brochures', labels: 'labels', books: 'books', packaging: 'packaging', 'restaurant-print': 'restaurant-print', 'large-format': 'large-format', custom: 'custom', 'ctp-plates': 'ctp-plates', 'film-output': 'film-output', 'packaging-labels': 'packaging-labels', 'cosmetic-cartons': 'cosmetic-cartons', pouches: 'pouches', 'paper-bags': 'paper-bags', menus: 'menus', 'hang-tags': 'hang-tags', notebooks: 'notebooks', 'package-restaurants': 'package-restaurants', 'package-corporate': 'package-corporate', 'package-retail': 'package-retail', 'package-publishing': 'package-publishing', 'package-cosmetics': 'package-cosmetics', 'package-events': 'package-events'
}

export default function ProductPreview({ product, form, update }) {
  const slug = product?.slug || ''
  const type = typeFor[slug] || 'custom'
  const label = ['labels', 'packaging-labels', 'hang-tags'].includes(type)
  const dimensional = ['labels', 'packaging-labels', 'hang-tags', 'packaging', 'cosmetic-cartons', 'pouches', 'paper-bags'].includes(type)
  const bundle = slug.startsWith('package-')
  const width = Number(form.printWidth) || (label ? 60 : 150)
  const height = Number(form.printHeight) || (label ? 40 : 100)
  const shape = form.printShape || 'rectangle'

  useEffect(() => {
    if (dimensional) {
      if (form.printWidth === undefined) update('printWidth', label ? 60 : 150)
      if (form.printHeight === undefined) update('printHeight', label ? 40 : 100)
      if (['packaging', 'cosmetic-cartons', 'pouches'].includes(type) && form.printDepth === undefined) update('printDepth', 60)
      if (label && form.printShape === undefined) update('printShape', 'rectangle')
    }
  }, [product?.id])

  return <section className="product-preview">
    <div className={`product-sketch product-sketch-${type}`} aria-label={`${product.name} outline preview`}><svg viewBox="0 0 280 180" role="img" aria-label={`${product.name} specification illustration`}><defs><pattern id={`print-grid-${type}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#d9cbbf" strokeWidth=".5"/></pattern></defs><rect width="280" height="180" fill={`url(#print-grid-${type})`}/><Outline type={type} shape={shape}/></svg></div>
    <div><div className="eyebrow">YOUR PRINT SPECIFICATION</div><h3>{product.name}</h3><p>{bundle ? 'Adjust each item in the package below.' : 'Choose your options below. The outline shows the exact format you are configuring.'}</p>{!bundle && dimensional && <div className="product-dimensions">{label && <label>Label shape<select value={shape} onChange={e => update('printShape', e.target.value)}><option value="rectangle">Rectangle</option><option value="rounded">Rounded corners</option><option value="circle">Circle</option><option value="custom">Custom cut</option></select></label>}<label>Width (mm)<input type="number" required min="1" max="5000" value={width} onChange={e => update('printWidth', e.target.value)}/></label><label>Height (mm)<input type="number" required min="1" max="5000" value={height} onChange={e => update('printHeight', e.target.value)}/></label>{['packaging', 'cosmetic-cartons', 'pouches'].includes(type) && <label>Depth (mm)<input type="number" required min="1" max="5000" value={form.printDepth || 60} onChange={e => update('printDepth', e.target.value)}/></label>}</div>}{!bundle && dimensional && <small>Custom dimensions and cutting are reviewed in your confirmed quote.</small>}</div>
  </section>
}
