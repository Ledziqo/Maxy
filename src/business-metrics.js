export function businessMetrics(orders,days,now=Date.now()) {
 const inPeriod=o=>days==='all'||new Date(o.created_at).getTime()>=now-Number(days)*86400000
 const rows=orders.filter(inPeriod),active=rows.filter(o=>o.status!=='cancelled')
 const quotes=rows.filter(o=>o.quote_status),accepted=quotes.filter(o=>o.quote_status==='accepted')
 const paid=active.filter(o=>o.payment_status==='verified')
 const completed=rows.filter(o=>o.status==='completed'),durations=completed.filter(o=>o.completed_at).map(o=>(new Date(o.completed_at)-new Date(o.created_at))/86400000).filter(v=>v>=0)
 const identity=o=>o.customer_id?`id:${o.customer_id}`:o.customer_email?`email:${o.customer_email.trim().toLowerCase()}`:`phone:${String(o.customer_phone||'').replace(/\D/g,'')}`
 const seen=new Map();for(const o of orders.filter(o=>o.status!=='cancelled')){const id=identity(o);if(id==='phone:')continue;seen.set(id,(seen.get(id)||0)+1)}
 const customers=[...new Set(active.map(identity))].filter(id=>id!=='phone:')
 const sum=list=>list.reduce((n,o)=>n+Number(o.total_amount||0),0)
 return {rows,active,completed:completed.length,quotes:quotes.length,conversion:quotes.length?accepted.length/quotes.length*100:null,paidValue:sum(paid),approvedUnpaid:sum(active.filter(o=>o.quote_status==='accepted'&&o.payment_status!=='verified')),estimateValue:active.filter(o=>o.quote_status&&o.quote_status!=='accepted').reduce((n,o)=>n+Number(o.estimate||0),0),turnaround:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:null,repeat:customers.filter(id=>seen.get(id)>1).length,customers:customers.length,services:Object.entries(active.reduce((a,o)=>{a[o.service]=(a[o.service]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1])}
}
