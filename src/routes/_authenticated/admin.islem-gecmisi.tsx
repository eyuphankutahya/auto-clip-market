import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Json } from "@/integrations/supabase/types";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { auditFields, auditTables } from "@/lib/admin-rules";
import { auditActions as actions, auditTimestamp as timestamp, auditFilterValues, auditCsvHeader, auditCsvRow } from "@/lib/audit-history";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv } from "@/lib/csv";
import { Download } from "lucide-react";
import { STATUS } from "@/lib/format";
const T = "İşlem Geçmişi — KlipsMarket", D = "İşlemlerin tarih, kullanıcı ve önceki/sonraki değerlerle kayıtları.";
export const Route = createFileRoute("/_authenticated/admin/islem-gecmisi")({ head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: AuditHistory });
const object = (value: Json | null): Record<string, Json | undefined> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const display = (value: Json | undefined, field: string) => value === null || value === undefined ? "—" : typeof value === "boolean" ? value ? "Açık" : "Kapalı" : field === "status" ? STATUS[String(value)] ?? String(value) : typeof value === "object" ? JSON.stringify(value) : String(value);
function AuditHistory() {
 const [page,setPage]=useState(0), [table,setTable]=useState(""), [action,setAction]=useState(""), [from,setFrom]=useState(""), [to,setTo]=useState(""), [q,setQ]=useState("");
 const [open,setOpen]=useState<Tables<"admin_audit_log">|null>(null);
 const [actor,setActor]=useState(""),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState("");
 const invalid=Boolean(from&&to&&from>to);
 const {data:users,error:usersError}=useQuery({queryKey:["admin-audit-users"],queryFn:()=>fetchAll((a,b)=>supabase.from("profiles").select("id,full_name,email").order("id").range(a,b))});
 function filteredQuery(){
  const values=auditFilterValues({table,action,actor,from,to,search:q});
  let query=supabase.from("admin_audit_log").select("*",{count:"exact"});
  if(values.table)query=query.eq("table_name",values.table); if(values.action)query=query.eq("action",values.action);
  if(values.actor==="system")query=query.is("actor_id",null); else if(values.actor)query=query.eq("actor_id",values.actor);
  if(values.from)query=query.gte("created_at",values.from); if(values.to)query=query.lt("created_at",values.to);
  if(values.search)query=query.ilike("record_label",`%${values.search}%`);
  return query.order("created_at",{ascending:false}).order("id");
 }
 async function exportHistory(){
  setExporting(true);setExportError("");
  try{
   const rows=await fetchAll((a,b)=>filteredQuery().range(a,b));
   const profiles=await fetchAll((a,b)=>supabase.from("profiles").select("id,full_name,email").order("id").range(a,b));
   const names=new Map(profiles.map(p=>[p.id,p.full_name||p.email]));
   downloadCsv("islem-gecmisi.csv",auditCsvHeader,rows.map(row=>auditCsvRow(row,names)));
  }catch(e){setExportError(e instanceof Error?e.message:"İşlem geçmişi indirilemedi.");}finally{setExporting(false);}
 }
 const {data,error,isFetching}=useQuery({queryKey:["admin-audit",page,table,action,actor,from,to,q],enabled:!invalid,queryFn:async()=>{
  const result=await filteredQuery().range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
  if(result.error)throw new Error(result.error.message);
  const ids=[...new Set((result.data??[]).flatMap(row=>row.actor_id?[row.actor_id]:[]))];
  const profiles=ids.length?await supabase.from("profiles").select("id,full_name,email").in("id",ids):{data:[],error:null};
  if(profiles.error)throw new Error(profiles.error.message);
  return {rows:result.data??[],total:result.count??0,profiles:new Map((profiles.data??[]).map(p=>[p.id,p.full_name||p.email]))};
 }});
 const b=object(open?.before_data??null),a=object(open?.after_data??null);
 const fields=[...new Set([...Object.keys(b),...Object.keys(a)])].filter(f=>!["revision","updated_at","created_at"].includes(f)&&JSON.stringify(b[f])!==JSON.stringify(a[f]));
 return <div className="space-y-4"><div className="flex flex-wrap items-end gap-3">
  <label className="text-xs">Başlangıç<Input aria-label="Geçmiş başlangıç" type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(0);}}/></label>
  <label className="text-xs">Bitiş<Input aria-label="Geçmiş bitiş" type="date" value={to} onChange={e=>{setTo(e.target.value);setPage(0);}}/></label>
  <select aria-label="İşlem alanı" value={table} onChange={e=>{setTable(e.target.value);setPage(0);}} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">Tüm alanlar</option>{Object.entries(auditTables).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
  <select aria-label="İşlem türü" value={action} onChange={e=>{setAction(e.target.value);setPage(0);}} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">Tüm işlemler</option>{Object.entries(actions).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
  <select aria-label="İşlemi yapan kullanıcı" value={actor} onChange={e=>{setActor(e.target.value);setPage(0);}} className="h-9 w-full rounded-md border bg-background px-2 text-sm sm:w-56"><option value="">Tüm kullanıcılar</option><option value="system">Sistem</option>{users?.map(user=><option key={user.id} value={user.id}>{user.full_name||user.email}</option>)}</select>
  <Input aria-label="İşlem ara" value={q} onChange={e=>{setQ(e.target.value);setPage(0);}} placeholder="Ürün, firma veya sipariş" className="max-w-xs"/>
  <Button variant="outline" disabled={invalid||exporting||isFetching||!data?.total} onClick={exportHistory}><Download className="h-4 w-4"/>{exporting?"İndiriliyor…":"CSV indir"}</Button>
 </div>{invalid&&<p role="alert" className="text-sm text-destructive">Bitiş tarihi başlangıçtan önce olamaz.</p>}{(error||usersError)&&<p role="alert" className="text-sm text-destructive">{error?.message??usersError?.message}</p>}{exportError&&<p role="alert" className="text-sm text-destructive">{exportError}</p>}{isFetching&&<p className="text-sm text-muted-foreground">Yükleniyor…</p>}
 <div className="overflow-x-auto rounded-md border"><table className="w-full bg-card text-sm"><thead className="bg-secondary text-left"><tr>{["Tarih","Kullanıcı","Alan","Kayıt","İşlem","Ayrıntı"].map(v=><th key={v} className="p-3">{v}</th>)}</tr></thead><tbody>
 {data?.rows.length===0&&<tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Bu filtrelerle işlem kaydı yok.</td></tr>}
 {data?.rows.map(row=><tr key={row.id} className="border-t"><td className="whitespace-nowrap p-3">{timestamp(row.created_at)}</td><td className="p-3">{row.actor_id?data.profiles.get(row.actor_id)??"Silinmiş kullanıcı":"Sistem"}</td><td className="whitespace-nowrap p-3">{auditTables[row.table_name]??row.table_name}</td><td className="min-w-40 p-3">{row.record_label}</td><td className={`p-3 font-semibold ${row.action==="DELETE"?"text-destructive":row.action==="INSERT"?"text-success":"text-accent"}`}>{actions[row.action]}</td><td className="p-3"><Button variant="outline" size="sm" onClick={()=>setOpen(row)}>İncele</Button></td></tr>)}
 </tbody></table></div>{data&&<Pager page={page} total={data.total} onChange={setPage}/>}<p className="text-xs text-muted-foreground">Kayıtlar bu bölümün açıldığı tarihten itibaren tutulur.</p>
 <Dialog open={Boolean(open)} onOpenChange={v=>{if(!v)setOpen(null);}}><DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{open?.record_label}</DialogTitle><DialogDescription>{open?`${timestamp(open.created_at)} · ${actions[open.action]} · ${open.actor_id?data?.profiles.get(open.actor_id)??"Silinmiş kullanıcı":"Sistem"}`:""}</DialogDescription></DialogHeader><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary text-left"><tr><th className="p-2">Alan</th><th className="p-2">Önce</th><th className="p-2">Sonra</th></tr></thead><tbody>{fields.map(f=><tr key={f} className="border-t align-top"><td className="p-2 font-semibold">{auditFields[f]??f}</td><td className="max-w-64 break-words p-2 text-muted-foreground">{display(b[f],f)}</td><td className="max-w-64 break-words p-2">{display(a[f],f)}</td></tr>)}</tbody></table></div></DialogContent></Dialog>
 </div>;
}
