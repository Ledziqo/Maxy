export const packages = [
 ['restaurants','Restaurants & cafés',[['Menus',50,20],['Takeaway boxes',100,35],['Labels',200,3.5],['Paper bags',100,25],['Loyalty cards',100,4.5]]],
 ['corporate','Corporate & NGOs',[['Company profiles',50,65],['Reports',50,65],['Business cards',200,4.5],['Event materials',50,28],['Folders',100,25]]],
 ['retail','Retail & products',[['Packaging',100,35],['Labels',200,3.5],['Stickers',200,3.5],['Displays',5,180],['Shopping bags',100,25]]],
 ['publishing','Books & education',[['Books',50,65],['Catalogues',50,65],['Manuals',50,40],['Notebooks',100,35],['Certificates',100,12]]],
 ['cosmetics','Cosmetics & hair care',[['Shampoo labels',200,3.5],['Hair-food jar labels',200,3.5],['Cosmetic cartons',100,35],['Seal stickers',200,3],['Product inserts',100,8]]],
 ['events','Events & hospitality',[['Invitations',100,12],['Banners',2,180],['Name badges',100,8],['Programs',100,20],['Thank-you cards',100,8]]]
].map(([slug,title,items])=>({slug,title,items:items.map(x=>x[0]),packageItems:items.map(([name,quantity,rate],i)=>({id:`item-${i}`,name,quantity,rate}))}));
export function packageQuote(rules,input={}) {
 const items=rules.packageItems.map(item=>{const quantity=Number(input.packageQuantities?.[item.id]??item.quantity);if(!Number.isInteger(quantity)||quantity<0||quantity>1000000)throw new Error('Package quantities must be whole numbers between 0 and 1,000,000.');const rate=Number(item.rate);if(!Number.isFinite(rate)||rate<0)throw new Error('Invalid package rate.');return {id:item.id,name:item.name,quantity,rate,total:quantity*rate}});
 if(!items.some(x=>x.quantity>0))throw new Error('Include at least one package item.');
 const production=items.reduce((sum,x)=>sum+x.total,0),designFee=input.designHelp?Number(rules.designFee||0):0,urgentFee=input.urgent?production*(Number(rules.urgentMultiplier||1.25)-1):0;
 return {quantity:1,unitPrice:production,production,designFee,urgentFee,subtotal:Math.round((production+designFee+urgentFee)*100)/100,items,selections:input};
}
