export const artworkKinds = {
  'business-cards':'card', brochures:'fold', labels:'label', books:'book', packaging:'box',
  'large-format':'banner', custom:'sheet', 'ctp-plates':'plate', 'film-output':'film',
  'packaging-labels':'roll', 'cosmetic-cartons':'carton', pouches:'pouch',
  'paper-bags':'bag', menus:'menu', 'hang-tags':'tag', notebooks:'notebook'
}
export const dimensionDefaults = {
  labels:[60,40], 'packaging-labels':[60,40], 'hang-tags':[50,90], packaging:[150,100],
  'cosmetic-cartons':[70,170], pouches:[140,220], 'paper-bags':[220,280],
  'business-cards':[85,55], books:[148,210], 'large-format':[1000,1000]
}
export const customDimensionProducts = ['labels','packaging-labels','hang-tags','packaging','cosmetic-cartons','pouches','paper-bags']
export function parseRules(value) { try { return (typeof value==='string'?JSON.parse(value):value)||{} } catch { return {} } }
export function previewDimensions(slug,form={}) {
  const presets={A5:[148,210],A4:[210,297],A3:[297,420],'85x55':[85,55],'90x50':[90,50],square:[55,55],'1x1':[1000,1000],'2x1':[2000,1000]}
  const fallback=dimensionDefaults[slug]||[148,210]
  const custom=customDimensionProducts.includes(slug)||form.size==='custom'
  const positive=(value,otherwise)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):otherwise
  const pair=custom?[positive(form.printWidth,fallback[0]),positive(form.printHeight,fallback[1])]:presets[form.size]||fallback
  return form.printShape==='circle'&&['labels','packaging-labels'].includes(slug)?[pair[0],pair[0]]:pair
}
export function itemKind(name) {
  const text=name.toLowerCase()
  const matches=[[/shampoo|bottle/,'bottle'],[/hair.food|jar/,'jar'],[/takeaway/,'takeaway'],[/carton/,'carton'],[/packaging|box/,'box'],[/pouch/,'pouch'],[/bag/,'bag'],[/loyalty/,'loyalty'],[/card|invitation/,'card'],[/catalog/,'catalogue'],[/profile/,'profile'],[/manual/,'manual'],[/notebook/,'notebook'],[/book/,'book'],[/certificate/,'certificate'],[/menu/,'menu'],[/folder/,'folder'],[/badge/,'badge'],[/seal|sticker/,'seal'],[/label/,'label'],[/banner|display|event material/,'banner'],[/insert|program|brochure/,'fold'],[/report/,'report']]
  return matches.find(([pattern])=>pattern.test(text))?.[1]||'sheet'
}
export function validatePrintForm(product,form) {
  const rules=parseRules(product.pricing_rules)
  if(rules.packageItems){
    const quantities=rules.packageItems.map(i=>Number(form.packageQuantities?.[i.id]??i.quantity))
    if(quantities.some(n=>!Number.isInteger(n)||n<0||n>1000000))return 'Package quantities must be whole numbers between 0 and 1,000,000.'
    if(!quantities.some(n=>n>0))return 'Include at least one package item.'
    return ''
  }
  if(!Number.isInteger(Number(form.quantity))||Number(form.quantity)<Number(product.minimum_quantity||1)||Number(form.quantity)>1000000)return `Enter a whole quantity from ${product.minimum_quantity||1} to 1,000,000.`
  if(customDimensionProducts.includes(product.slug)||form.size==='custom'){
    for(const key of ['printWidth','printHeight','printDepth'])if(form[key]!==undefined&&(!Number.isFinite(Number(form[key]))||Number(form[key])<=0||Number(form[key])>5000))return 'Dimensions must be between 1 and 5,000 mm.'
  }
  return ''
}
