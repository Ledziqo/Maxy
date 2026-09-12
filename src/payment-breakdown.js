export function paymentBreakdown(orders,days='all',now=Date.now()){
 const groups=new Map(),entries=[];let totalCents=0,undated=0
 for(const order of orders){
   if(order.payment_status!=='verified')continue
   const date=Date.parse(order.payment_verified_at)
   if(days!=='all'&&(!Number.isFinite(date)||date<now-Number(days)*86400000||date>now)){
     if(!Number.isFinite(date))undated++
     continue
   }
   const amount=Number(order.total_amount)
   if(order.total_amount==null||!Number.isFinite(amount)||amount<0)continue
   const cents=Math.round(amount*100),name=String(order.payment_method||'Unspecified').trim()||'Unspecified'
   const key=name.toLowerCase(),row=groups.get(key)||{name,cents:0,count:0}
   row.cents+=cents;row.count++;groups.set(key,row);totalCents+=cents
   entries.push({...order,method:name,amount:cents/100,date:Number.isFinite(date)?date:null})
 }
 entries.sort((a,b)=>(b.date||0)-(a.date||0))
 return {rows:[...groups.values()].map(({cents,...row})=>({...row,amount:cents/100})).sort((a,b)=>b.amount-a.amount),total:totalCents/100,undated,entries}
}
