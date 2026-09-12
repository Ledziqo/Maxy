import React from 'react'
import PrintArtwork from './PrintArtwork.jsx'
import {customDimensionProducts,parseRules,previewDimensions} from './print-preview-model.js'
import {useSiteLanguage} from './StorefrontEnhancements.jsx'

export default function ProductPreview({product,form,update}) {
  const am=useSiteLanguage()==='am'
  if(!product)return null
  const slug=product.slug,rules=parseRules(product.pricing_rules)
  const bundle=Boolean(rules.packageItems)||slug.startsWith('package-')||slug==='restaurant-print'
  const label=['labels','packaging-labels'].includes(slug)
  const dimensional=customDimensionProducts.includes(slug)||form.size==='custom'
  const [width,height]=previewDimensions(slug,form),shape=form.printShape||'rectangle'
  return <section className="product-preview">
    <PrintArtwork slug={slug} form={form} rules={rules} am={am}/>
    <div><div className="eyebrow">{am?'የህትመትዎ ዝርዝር':'YOUR PRINT SPECIFICATION'}</div><h3>{product.name}</h3><p>{bundle?(am?'ከታች ያለውን የእያንዳንዱን እቃ ብዛት ያስተካክሉ።':'Each illustration corresponds to an item in your package. Adjust quantities below.'):(am?'መጠን፣ ቁሳቁስ እና ማጠናቀቂያ ይምረጡ።':'Choose your dimensions, material and finish. This is a format guide, not your final artwork.')}</p>
    {!bundle&&dimensional&&<div className="product-dimensions">
      {label&&<label>{am?'የመለያ ቅርጽ':'Label shape'}<select value={shape} onChange={e=>update('printShape',e.target.value)}><option value="rectangle">{am?'አራት ማዕዘን':'Rectangle'}</option><option value="rounded">{am?'የተጠጋጉ ጠርዞች':'Rounded corners'}</option><option value="circle">{am?'ክብ':'Circle'}</option><option value="custom">{am?'ብጁ ቅርጽ':'Custom cut'}</option></select></label>}
      <label>{shape==='circle'&&label?(am?'ዲያሜትር (ሚሜ)':'Diameter (mm)'):(am?'ወርድ (ሚሜ)':'Width (mm)')}<input type="number" min="1" max="5000" value={form.printWidth??width} onChange={e=>update('printWidth',e.target.value)}/></label>
      {!(shape==='circle'&&label)&&<label>{am?'ቁመት (ሚሜ)':'Height (mm)'}<input type="number" min="1" max="5000" value={form.printHeight??height} onChange={e=>update('printHeight',e.target.value)}/></label>}
      {['packaging','cosmetic-cartons','pouches','paper-bags'].includes(slug)&&<label>{am?'ጥልቀት (ሚሜ)':'Depth / gusset (mm)'}<input type="number" min="1" max="5000" value={form.printDepth??60} onChange={e=>update('printDepth',e.target.value)}/></label>}
    </div>}
    {!bundle&&dimensional&&<small>{am?'ብጁ መጠንና ቅርጽ በመጨረሻው ዋጋ ማረጋገጫ ይገመገማሉ።':'Custom dimensions and cutting are reviewed in your confirmed quote.'}</small>}
    </div>
  </section>
}
