import React, { useEffect } from 'react'

function Logo({ x = 140, y = 95, size = 20 }) {
  return <text x={x} y={y} textAnchor="middle" fill="#b82931" fontSize={size} fontWeight="700">maxrez</text>
}

function BundleArtwork({ type }) {
  if (type === 'cosmetics') return <g fill="none" stroke="#932331" strokeWidth="2"><rect x="33" y="72" width="45" height="73" rx="10" fill="#fffaf3"/><path d="M42 72v-12h27v12M47 52h17"/><path d="M42 98h27" stroke="#d99c8a"/><Logo x="55" y="122" size="10"/><circle cx="112" cy="111" r="31" fill="#f3d8c5"/><path d="M93 91c12-13 27-13 39 0"/><Logo x="112" y="117" size="10"/><path d="M159 54l46-12 24 14-46 13z" fill="#f4d8c3"/><path d="M159 54v74l24 13V69z" fill="#d99c8a"/><path d="M183 69l46-13v74l-46 11z" fill="#fff3e5"/><Logo x="193" y="106" size="11"/><rect x="95" y="41" width="34" height="15" rx="7" fill="#fffaf3"/><Logo x="112" y="52" size="7"/></g>
  if (type === 'restaurants') return <g fill="none" stroke="#932331" strokeWidth="2"><path d="M27 50h72l-8 90H35z" fill="#fffaf3"/><path d="M43 50c0-27 40-27 40 0"/><Logo x="63" y="95" size="14"/><path d="M125 70l43-13 35 17-43 14z" fill="#f4d8c3"/><path d="M125 70v47l35 17V88z" fill="#d99c8a"/><path d="M160 88l43-14v47l-43 13z" fill="#fff3e5"/><Logo x="170" y="109" size="9"/><rect x="42" y="30" width="67" height="31" rx="2" fill="#fffaf3"/><path d="M51 40h48M51 49h35" stroke="#d99c8a"/><Logo x="75" y="58" size="8"/><circle cx="230" cy="44" r="18" fill="#f3d8c5"/><Logo x="230" y="48" size="7"/></g>
  if (type === 'corporate') return <g fill="none" stroke="#932331" strokeWidth="2"><rect x="34" y="37" width="91" height="112" rx="3" fill="#fffaf3"/><path d="M50 59h60M50 73h49M50 87h55M50 101h41" stroke="#d99c8a"/><Logo x="80" y="128" size="13"/><rect x="143" y="58" width="100" height="62" rx="5" fill="#f3d8c5"/><path d="M143 75h100M159 58v-9h68v9"/><Logo x="193" y="102" size="15"/><rect x="159" y="130" width="72" height="26" rx="3" fill="#fffaf3"/><Logo x="195" y="147" size="10"/></g>
  if (type === 'retail') return <g fill="none" stroke="#932331" strokeWidth="2"><path d="M31 63l63-20 47 23-63 20z" fill="#f4d8c3"/><path d="M31 63v55l47 23V86z" fill="#d99c8a"/><path d="M78 86l63-20v55l-63 20z" fill="#fff3e5"/><Logo x="103" y="113" size="14"/><path d="M164 50h68l-6 88h-56z" fill="#fffaf3"/><path d="M180 50c0-23 36-23 36 0"/><Logo x="198" y="101" size="14"/><path d="M163 37h40v18h-40z" fill="#f3d8c5"/><Logo x="183" y="50" size="8"/></g>
  if (type === 'publishing') return <g fill="none" stroke="#932331" strokeWidth="2"><path d="M28 46h66c9 0 15 6 15 15v90H44c-9 0-16-7-16-16z" fill="#fffaf3"/><path d="M44 46v89M57 64h31M57 77h26M57 90h32" stroke="#d99c8a"/><Logo x="76" y="126" size="13"/><path d="M127 57h92v93h-92z" fill="#f3d8c5"/><path d="M142 76h61M142 89h45M142 102h55"/><Logo x="173" y="133" size="14"/><rect x="228" y="37" width="27" height="111" rx="3" fill="#fffaf3"/><path d="M236 55h11M236 68h11M236 81h11" stroke="#d99c8a"/></g>
  return <g fill="none" stroke="#932331" strokeWidth="2"><rect x="29" y="49" width="86" height="62" rx="3" fill="#fffaf3"/><path d="M29 66h86"/><Logo x="72" y="94" size="13"/><path d="M139 42h89v49h-89z" fill="#f3d8c5"/><path d="M151 42v-9h65v9"/><Logo x="183" y="72" size="12"/><circle cx="167" cy="129" r="20" fill="#fffaf3"/><Logo x="167" y="133" size="8"/><path d="M204 112h35v39h-35z" fill="#fffaf3"/><Logo x="221" y="136" size="8"/></g>
}

export default function ProductPreview({ product, form, update }) {
  const slug = product?.slug || ''
  const pack = slug.includes('packaging') || slug.includes('carton') || slug.includes('box')
  const label = slug.includes('label') || slug.includes('sticker') || slug.includes('tag')
  const book = slug.includes('book') || slug.includes('notebook') || slug.includes('brochure') || slug.includes('menu')
  const bundle = slug.startsWith('package-')
  const bag = slug.includes('bag') || slug.includes('pouch')
  const card = slug.includes('card') || slug.includes('certificate')
  const bundleType = bundle ? slug.replace('package-', '') : ''
  const kind = bundle ? 'bundle' : bag ? 'bag' : pack ? 'box' : label ? 'label' : book ? 'book' : card ? 'card' : 'sheet'
  const width = Number(form.printWidth) || (label ? 60 : pack ? 150 : 90)
  const height = Number(form.printHeight) || (label ? 40 : pack ? 100 : 55)
  const shape = form.printShape || 'rectangle'

  useEffect(() => {
    if (label || pack) {
      if (form.printWidth === undefined) update('printWidth', label ? 60 : 150)
      if (form.printHeight === undefined) update('printHeight', label ? 40 : 100)
      if (pack && form.printDepth === undefined) update('printDepth', 60)
      if (label && form.printShape === undefined) update('printShape', 'rectangle')
    }
  }, [product?.id])

  return <section className="product-preview">
    <div className={`product-sketch product-sketch-${kind}`} aria-label={`${product.name} outline preview`}>
      <svg viewBox="0 0 280 180" role="img" aria-label={`${product.name} specification illustration`}>
        <defs><pattern id={`print-grid-${kind}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#d9cbbf" strokeWidth=".5"/></pattern></defs>
        <rect width="280" height="180" fill={`url(#print-grid-${kind})`}/>
        {kind === 'bundle' && <BundleArtwork type={bundleType}/>}
        {kind === 'box' && <g fill="none" stroke="#932331" strokeWidth="2"><path d="M55 58l90-28 70 34-90 29z" fill="#f4d8c3"/><path d="M55 58v67l70 30V93z" fill="#d99c8a"/><path d="M125 93l90-29v66l-90 25z" fill="#fff3e5"/><Logo x="158" y="120" size="18"/></g>}
        {kind === 'bag' && <g fill="none" stroke="#932331" strokeWidth="2"><path d="M75 48h130l-10 96H85z" fill="#fffaf3"/><path d="M108 50c0-30 64-30 64 0"/><path d="M94 74h92" stroke="#d99c8a"/><Logo x="140" y="112" size="22"/></g>}
        {kind === 'label' && <g fill="none" stroke="#932331" strokeWidth="2"><rect x="46" y="34" width="188" height="112" rx={shape === 'circle' ? 56 : shape === 'rounded' ? 18 : 4} fill="#fffaf3"/><path d="M60 119c34-34 74-38 112-19 18 9 35 11 53-4" stroke="#d99c8a"/><Logo x="140" y="91" size="25"/></g>}
        {kind === 'book' && <g fill="none" stroke="#932331" strokeWidth="2"><path d="M62 38h126c12 0 20 8 20 20v87H81c-11 0-19-8-19-19z" fill="#fffaf3"/><path d="M81 38v107M100 55h82M100 73h64M100 91h75" stroke="#d99c8a"/><Logo x="147" y="125" size="20"/></g>}
        {kind === 'card' && <g fill="none" stroke="#932331" strokeWidth="2"><rect x="38" y="48" width="204" height="84" rx="7" fill="#fffaf3"/><path d="M38 67h204" stroke="#d99c8a"/><circle cx="71" cy="99" r="15" fill="#f3d8c5"/><Logo x="156" y="106" size="23"/></g>}
        {kind === 'sheet' && <g fill="none" stroke="#932331" strokeWidth="2"><rect x="70" y="27" width="140" height="126" rx="3" fill="#fffaf3"/><path d="M88 52h104M88 67h77M88 82h92" stroke="#d99c8a"/><Logo x="140" y="124" size="25"/></g>}
      </svg>
    </div>
    <div><div className="eyebrow">YOUR PRINT SPECIFICATION</div><h3>{product.name}</h3><p>{bundle ? 'Adjust each item in the package below.' : 'Choose your options below. The outline shows the format you are configuring.'}</p>{!bundle && <div className="product-dimensions">{label && <label>Label shape<select value={shape} onChange={e => update('printShape', e.target.value)}><option value="rectangle">Rectangle</option><option value="rounded">Rounded corners</option><option value="circle">Circle</option><option value="custom">Custom cut</option></select></label>}{(label || pack) && <><label>Width (mm)<input type="number" required min="1" max="5000" value={width} onChange={e => update('printWidth', e.target.value)}/></label><label>Height (mm)<input type="number" required min="1" max="5000" value={height} onChange={e => update('printHeight', e.target.value)}/></label>{pack && <label>Depth (mm)<input type="number" required min="1" max="5000" value={form.printDepth || 60} onChange={e => update('printDepth', e.target.value)}/></label>}</>}</div>}{(label || pack) && <small>Custom dimensions and cutting are reviewed in your confirmed quote.</small>}</div>
  </section>
}
