export function productRules(slug,rules) {
 const specs={
  'business-cards':{sizes:[['85x55','85 × 55 mm'],['90x50','90 × 50 mm'],['square','Square · 55 × 55 mm']],materials:['Standard card','Premium card','Luxury card']},
  labels:{sizes:[['custom','Your dimensions above']],materials:['Adhesive paper','White vinyl','Clear vinyl']},
  packaging:{sizes:[['custom','Your box dimensions above']],materials:['Folding carton','Kraft board','Rigid board']},
  books:{sizes:[['A5','A5 · 148 × 210 mm'],['A4','A4 · 210 × 297 mm'],['custom','Custom trim size']],materials:['Standard text paper','Coated paper','Premium book paper']},
  'large-format':{sizes:[['1x1','1 × 1 m'],['2x1','2 × 1 m'],['custom','Custom dimensions']],materials:['Banner material','Adhesive vinyl','Display material']}
 }
 const spec=specs[slug];if(!spec)return rules
 const isGeneric=rules.sizes?.map(s=>s.value).join(',')==='A5,A4,A3'
 if(!isGeneric)return rules
 return {...rules,sizes:spec.sizes.map(([value,label],i)=>({value,label,multiplier:i===0?1:i===1?1.35:1})),materials:spec.materials.map((label,i)=>({...rules.materials?.[i],value:rules.materials?.[i]?.value||`material-${i}`,label,multiplier:rules.materials?.[i]?.multiplier||1}))}
}
