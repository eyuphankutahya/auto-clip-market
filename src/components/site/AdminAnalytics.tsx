import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { analysisPeriods, percentageChange } from "@/lib/admin-rules";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stat } from "@/components/site/CariStatement";
import { downloadCsv } from "@/lib/csv";
import { Download } from "lucide-react";
const n=z.coerce.number();
const schema=z.object({ revenue:n,previous_revenue:n,order_count:n,quantity:n,payments:n,previous_payments:n,receivable:n,customer_count:n,
 customers:z.array(z.object({id:z.string(),name:z.string(),orders:n,revenue:n})),
 products:z.array(z.object({product_id:z.string().nullable(),sku:z.string(),name:z.string(),quantity:n,revenue:n})),
 accounts:z.array(z.object({id:z.string(),name:z.string(),debit:n,credit:n,balance:n})),
 daily:z.array(z.object({date_key:z.string(),total:n})),methods:z.array(z.object({method:z.string(),amount:n})) });
const day=(d:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
export function AdminAnalytics(){
 const [from,setFrom]=useState(()=>day(new Date(Date.now()-29*864e5))),[to,setTo]=useState(()=>day(new Date()));
 const [tab,setTab]=useState("customers");
 const invalid=!from||!to||from>to;
 const {data,error,isFetching}=useQuery({queryKey:["admin-period-analysis",from,to],enabled:!invalid,queryFn:async()=>{
  const period=analysisPeriods(from,to); const result=await supabase.rpc("admin_period_analysis",{_from:period.from,_to:period.to,_previous_from:period.previousFrom});
  if(result.error)throw new Error(result.error.message);return schema.parse(result.data);
 }});
 const growth=data?percentageChange(data.revenue,data.previous_revenue):null;
 const exportData=async()=>{if(invalid)return;const period=analysisPeriods(from,to);const full=await supabase.rpc("admin_period_analysis",{_from:period.from,_to:period.to,_previous_from:period.previousFrom,_limit:null} as never);if(full.error)return;const data=schema.parse(full.data);const header=tab==="customers"?["Müşteri","Sipariş","Ciro (TL)"]:tab==="products"?["KM No","Ürün","Adet","Ciro (TL)"]:["Cari","Toplam borç (TL)","Toplam ödeme (TL)","Bakiye (TL)"];const rows=tab==="customers"?data.customers.map(r=>[r.name,r.orders,r.revenue]):tab==="products"?data.products.map(r=>[r.sku,r.name,r.quantity,r.revenue]):data.accounts.map(r=>[r.name,r.debit,r.credit,r.balance]);downloadCsv(`analiz-${tab}-${from}-${to}.csv`,header,rows);};
 return <section className="space-y-5 border-b pb-8"><div className="flex flex-wrap items-end gap-3"><h2 className="mr-auto font-display text-lg font-extrabold">Satış ve cari analizi</h2>
 <label className="text-xs">Başlangıç<Input aria-label="Analiz başlangıç" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="text-xs">Bitiş<Input aria-label="Analiz bitiş" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
 <Button variant="outline" size="sm" onClick={()=>{setFrom(day(new Date(Date.now()-6*864e5)));setTo(day(new Date()));}}>Son 7 gün</Button><Button variant="outline" size="sm" onClick={()=>{setFrom(day(new Date(Date.now()-29*864e5)));setTo(day(new Date()));}}>Son 30 gün</Button>
 </div>{invalid&&<p role="alert" className="text-destructive">Geçerli bir tarih aralığı seçin.</p>}{error&&<p role="alert" className="text-destructive">{error.message}</p>}{isFetching&&<p className="text-sm text-muted-foreground">Yükleniyor…</p>}
 {data&&<><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Dönem cirosu" value={money(data.revenue)}/><Stat label="Sipariş / satılan adet" value={`${data.order_count} / ${data.quantity}`}/><Stat label="Dönem tahsilatı" value={money(data.payments)}/><Stat label="Güncel cari alacak" value={money(data.receivable)}/></div>
 <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><p>Önceki eşit dönem: <b className="text-foreground">{money(data.previous_revenue)}</b> · <span className={growth!==null&&growth<0?"text-destructive":"text-success"}>{growth===null?"Karşılaştırılacak önceki satış yok":`${growth>0?"+":""}%${growth}`}</span></p><p>Önceki dönem tahsilatı: <b className="text-foreground">{money(data.previous_payments)}</b></p><p>{data.customer_count} müşteri · Ortalama sipariş <b className="text-foreground">{money(data.order_count?data.revenue/data.order_count:0)}</b></p></div>
 <Tabs value={tab} onValueChange={setTab}><div className="flex flex-wrap items-center justify-between gap-3"><TabsList><TabsTrigger value="customers">Müşteriler</TabsTrigger><TabsTrigger value="products">Ürünler</TabsTrigger><TabsTrigger value="accounts">Cari hesaplar</TabsTrigger></TabsList><Button variant="outline" size="sm" onClick={exportData}><Download/>Tümünü CSV indir</Button></div>
 <TabsContent value="customers"><div className="overflow-x-auto rounded-md border"><table className="w-full bg-card text-sm"><thead className="bg-secondary text-left"><tr><th className="p-3">Müşteri · ilk 20</th><th className="p-3 text-right">Sipariş</th><th className="p-3 text-right">Ciro</th></tr></thead><tbody>{!data.customers.length&&<tr><td colSpan={3} className="p-5 text-center text-muted-foreground">Bu dönemde satış yok.</td></tr>}{data.customers.map(r=><tr key={r.id} className="border-t"><td className="p-3">{r.name}</td><td className="p-3 text-right">{r.orders}</td><td className="p-3 text-right font-semibold">{money(r.revenue)}</td></tr>)}</tbody></table></div></TabsContent>
 <TabsContent value="products"><div className="overflow-x-auto rounded-md border"><table className="w-full bg-card text-sm"><thead className="bg-secondary text-left"><tr><th className="p-3">KM No</th><th className="p-3">Ürün · ilk 20</th><th className="p-3 text-right">Adet</th><th className="p-3 text-right">Ciro</th></tr></thead><tbody>{!data.products.length&&<tr><td colSpan={4} className="p-5 text-center text-muted-foreground">Bu dönemde satış yok.</td></tr>}{data.products.map((r,i)=><tr key={`${r.product_id}-${i}`} className="border-t"><td className="p-3 font-oem">{r.sku}</td><td className="min-w-44 p-3">{r.name}</td><td className="p-3 text-right">{r.quantity}</td><td className="whitespace-nowrap p-3 text-right font-semibold">{money(r.revenue)}</td></tr>)}</tbody></table></div></TabsContent>
 <TabsContent value="accounts"><div className="overflow-x-auto rounded-md border"><table className="w-full bg-card text-sm"><thead className="bg-secondary text-left"><tr><th className="p-3">Cari · bakiye sırasıyla ilk 20</th><th className="p-3 text-right">Toplam borç</th><th className="p-3 text-right">Toplam ödeme</th><th className="p-3 text-right">Bakiye</th></tr></thead><tbody>{!data.accounts.length&&<tr><td colSpan={4} className="p-5 text-center text-muted-foreground">Cari hesap yok.</td></tr>}{data.accounts.map(r=><tr key={r.id} className="border-t"><td className="p-3"><Button asChild variant="link" className="h-auto p-0"><Link to="/admin/cari/$id" params={{id:r.id}}>{r.name}</Link></Button></td><td className="whitespace-nowrap p-3 text-right">{money(r.debit)}</td><td className="whitespace-nowrap p-3 text-right text-success">{money(r.credit)}</td><td className="whitespace-nowrap p-3 text-right font-semibold">{money(r.balance)}</td></tr>)}</tbody></table></div></TabsContent>
 </Tabs><div className="grid gap-6 md:grid-cols-2"><div><h3 className="mb-2 text-sm font-bold">Günlük satış</h3><div className="max-h-48 overflow-y-auto text-sm">{data.daily.length?data.daily.map(r=><div key={r.date_key} className="flex justify-between border-b py-2"><span>{r.date_key.split("-").reverse().join(".")}</span><b>{money(r.total)}</b></div>):<p className="text-muted-foreground">Satış yok.</p>}</div></div><div><h3 className="mb-2 text-sm font-bold">Tahsilat yöntemleri</h3>{data.methods.length?data.methods.map(r=><div key={r.method} className="flex justify-between border-b py-2 text-sm"><span>{r.method}</span><b>{money(r.amount)}</b></div>):<p className="text-sm text-muted-foreground">Bu dönemde tahsilat yok.</p>}</div></div></>}
 </section>;
}
