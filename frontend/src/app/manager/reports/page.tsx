"use client";

import { useEffect, useMemo, useState } from "react";
import { getHotelCurrency } from "../../../lib/hotel";
import type { LucideIcon } from "lucide-react";
import { Calendar, Banknote, Building2, Users, Home, Settings, BarChart3, Printer, Download } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH } from "@/lib/api";
import { printHtml } from "@/lib/print";

/* ─── Types ──────────────────────────────────────────────────── */
type TPeriod = "today"|"last7"|"month"|"custom";
type TTab    = "overview"|"reservations"|"web"|"guests"|"rooms"|"financial"|"folio"|"food"
             |"cleaning"|"maintenance"|"lostfound"|"staff"|"shifts"|"dayclose"|"audit"|"dues";

interface Reservation {
  id:number; hotel:number; booking_number:string;
  guest_first_name:string; guest_last_name:string;
  room:number|null; room_number:string|null; room_floor:number|null;
  check_in_date:string; check_out_date:string;
  total:string|number; paid:string|number; currency:string;
  // مشتقّات سلسلة المال (الغرفة + الخدمات − المدفوع)
  grand_total?:string|number; balance_due?:string|number; charges_total?:string|number;
  status:string; source?:string; created_at?:string; updated_at?:string;
}
interface RoomItem {
  id:number; number:string; floor:number; type:string;
  capacity:number; status:string; updated_at:string;
}
interface OrderItem { name:string; quantity?:number; price?:number; }
interface FoodOrder {
  id:number; hotel:number;
  guest_name?:string|null; room_number?:string|null; table_number?:string|null;
  payment_method:string; status:string;
  items?:OrderItem[]|string; amount:number; currency?:string;
  created_at:string; source_type?:string;
}
interface Ticket {
  id:number; hotel:number; ticket_no:string;
  room:number|null; room_number:string|null; room_floor:number|null;
  issue_type:string; priority:string; status:string; description:string;
  assigned_to_name:string|null; source:string;
  created_at:string; updated_at:string;
}
interface HotelInfo { id:number; name:string; city?:string; address?:string; phone?:string; }

/* ─── Constants (non-translatable) ──────────────────────────── */
const RES_STATUS_STYLE:Record<string,React.CSSProperties> = {
  pending:    {background:"#f1f5f9",color:"#475569"},
  confirmed:  {background:"#dbeafe",color:"#1d4ed8"},
  checked_in: {background:"#dcfce7",color:"#15803d"},
  checked_out:{background:"#f0fdf4",color:"#166534"},
  cancelled:  {background:"#fee2e2",color:"#b91c1c"},
  no_show:    {background:"#faf5ff",color:"#7c3aed"},
};
const ROOM_STATUS_COLOR:Record<string,string> = {
  available:"#22c55e", occupied:"#2563eb", cleaning:"#f59e0b",
  maintenance:"#ea580c", out_of_service:"#dc2626", archived:"#94a3b8",
};
const MAINT_STATUS_COLOR:Record<string,string> = {
  open:"#dc2626", in_progress:"#2563eb", waiting_parts:"#f59e0b",
  resolved:"#22c55e", cancelled:"#94a3b8",
};
const MAINT_PRIORITY_COLOR:Record<string,string> = {
  low:"#22c55e", medium:"#f59e0b", high:"#ea580c", urgent:"#dc2626",
};

/* ─── Helpers ────────────────────────────────────────────────── */
function todayIso():string { return new Date().toISOString().split("T")[0]; }

function calcRange(period:TPeriod,cf:string,ct:string):{from:string,to:string}{
  const td = todayIso();
  if(period==="today") return {from:td,to:td};
  if(period==="last7"){
    const d=new Date(); d.setDate(d.getDate()-6);
    return {from:d.toISOString().split("T")[0],to:td};
  }
  if(period==="month"){
    const n=new Date();
    const first=new Date(n.getFullYear(),n.getMonth(),1);
    return {from:first.toISOString().split("T")[0],to:td};
  }
  return {from:cf,to:ct};
}

function inRange(d:string,from:string,to:string):boolean{
  if(!d) return false;
  const ds=d.slice(0,10);
  if(from&&ds<from) return false;
  if(to  &&ds>to  ) return false;
  return true;
}

function fmtDate(d:string):string{
  try{return new Date(d).toLocaleDateString("ar-SA");}catch{return d||"—";}
}
function n(v:string|number):number{ return Number(v)||0; }
/** الدين = balance_due من الـBackend (يشمل الفوليو/الطعام) أو total−paid احتياطًا. */
function resBal(r:{total:string|number;paid:string|number;balance_due?:string|number}):number{
  if(r.balance_due!=null) return Math.max(0,n(r.balance_due));
  return Math.max(0,n(r.total)-n(r.paid));
}
function money(v:string|number,cur="USD"):string{
  return `${n(v).toLocaleString("en-US")} ${cur}`;
}
function parseItems(raw?:OrderItem[]|string):OrderItem[]{
  if(!raw) return [];
  if(typeof raw==="string"){ try{return JSON.parse(raw);}catch{return [{name:raw}];} }
  return Array.isArray(raw)?raw:[];
}
function orderNo(id:number):string{ return `ORD-${String(id).padStart(5,"0")}`; }
function countBy<T>(arr:T[],key:(t:T)=>string):Record<string,number>{
  const m:Record<string,number>={};
  arr.forEach(t=>{const k=key(t);m[k]=(m[k]??0)+1;});
  return m;
}

/* ─── CSV ────────────────────────────────────────────────────── */
function dlCSV(rows:string[][],filename:string){
  const bom="﻿";
  const content=bom+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob([content],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

/* ─── Print ──────────────────────────────────────────────────── */
function doPrint(
  tabLabel:string, periodLabel:string, dateFrom:string, dateTo:string,
  hotel:HotelInfo|null,
  stats:{resCount:number;totalMovement:number;occupancyPct:number;
         activeGuests:number;roomAccount:number;remaining:number;currency:string;adr:number;revpar:number}
){
  const now=new Date().toLocaleString("en-US");
  const html=`<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>تقرير - ${hotel?.name||"الفندق"}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:28px;color:#1e293b;direction:rtl;font-size:14px}
.hdr{border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px}
.hotel{font-size:20px;font-weight:900;margin-bottom:4px}
.sub{font-size:12px;color:#64748b;margin-top:2px}
.title{font-size:15px;font-weight:700;color:#4f46e5;margin:10px 0 4px}
.prow{display:flex;gap:10px;margin:10px 0;flex-wrap:wrap}
.pbox{background:#f1f5f9;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:700}
.pl{font-size:10px;color:#94a3b8;margin-bottom:2px}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
th{padding:7px 10px;text-align:right;background:#f1f5f9;border-bottom:2px solid #e2e8f0;font-weight:700}
td{padding:6px 10px;border-bottom:1px solid #f1f5f9}
.v{font-weight:700;color:#1d4ed8}
.foot{text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:18px;padding-top:10px}
@media print{body{padding:14px}}
</style></head>
<body>
<div class="hdr">
  <div class="hotel">${hotel?.name||"الفندق"}</div>
  ${hotel?.city?`<div class="sub">${hotel.city}</div>`:""}
  <div class="title">تقرير الفندق — ${tabLabel}</div>
  <div class="sub">وقت الطباعة: ${now}</div>
</div>
<div class="prow">
  <div class="pbox"><div class="pl">الفترة</div>${periodLabel}</div>
  <div class="pbox"><div class="pl">من تاريخ</div>${dateFrom||"—"}</div>
  <div class="pbox"><div class="pl">إلى تاريخ</div>${dateTo||"—"}</div>
</div>
<table>
  <thead><tr><th>البيان</th><th>القيمة</th></tr></thead>
  <tbody>
    <tr><td>الحجوزات ضمن الفترة</td><td class="v">${stats.resCount}</td></tr>
    <tr><td>إجمالي الحركة</td><td class="v">${money(stats.totalMovement,stats.currency)}</td></tr>
    <tr><td>نسبة الإشغال</td><td class="v">${stats.occupancyPct}%</td></tr>
    <tr><td>النزلاء المقيمون</td><td class="v">${stats.activeGuests}</td></tr>
    <tr><td>على حساب الغرف</td><td class="v">${money(stats.roomAccount,stats.currency)}</td></tr>
    <tr><td>إجمالي المتبقي</td><td class="v">${money(stats.remaining,stats.currency)}</td></tr>
    <tr><td>متوسط سعر الغرفة (ADR)</td><td class="v">${money(stats.adr,stats.currency)}</td></tr>
    <tr><td>إيراد الغرفة المتاحة (RevPAR)</td><td class="v">${money(stats.revpar,stats.currency)}</td></tr>
  </tbody>
</table>
<div class="foot">تاريخ إنشاء التقرير: ${now}</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
</body></html>`;
  printHtml(html);
}

/* ─── Bar ────────────────────────────────────────────────────── */
function Bar({label,count,max,color,sub}:{label:string;count:number;max:number;color:string;sub?:string}){
  const pct=max>0?Math.min(100,Math.round(count/max*100)):0;
  return(
    <div style={{marginBottom:"0.55rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <span style={{fontSize:12,color:"var(--color-heading)",fontWeight:600}}>{label}</span>
        <span style={{fontSize:12,color:"var(--color-muted)",fontWeight:700}}>{count}{sub?` ${sub}`:""}</span>
      </div>
      <div style={{background:"#e2e8f0",borderRadius:6,height:9,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:6,transition:"width .35s"}}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function ReportsPage(){
  const { t, lang } = useLang();

  const hotelId=typeof window!=="undefined"?(localStorage.getItem("hotel_id")??""):"";

  /* ── Translatable label maps (inside component to use t()) ── */
  const TAB_LABELS:Record<TTab,string> = {
    overview:t("نظرة عامة"), reservations:t("الحجوزات"), financial:t("المالية"),
    rooms:t("الغرف والإشغال"), food:t("المطعم والكافتريا"), maintenance:t("الصيانة"),
    web:t("حجوزات الموقع"), guests:t("النزلاء"), folio:t("الفوليو والذمم"),
    cleaning:t("التنظيف"), lostfound:t("المفقودات"), staff:t("الموظفون"),
    shifts:t("الورديات"), dayclose:t("التدقيق اليومي"), audit:t("سجل النشاط"), dues:t("مستحقات المنصة"),
  };
  const PERIOD_LABELS:Record<TPeriod,string> = {
    today:t("اليوم"), last7:t("آخر 7 أيام"), month:t("هذا الشهر"), custom:t("فترة مخصصة"),
  };
  const RES_STATUS_LABELS:Record<string,string> = {
    pending:t("قيد الانتظار"), confirmed:t("مؤكد"), checked_in:t("داخل الإقامة"),
    checked_out:t("مكتمل"), cancelled:t("ملغي"), no_show:t("لم يحضر"),
  };
  const ROOM_STATUS_LABELS:Record<string,string> = {
    available:t("متاحة"), occupied:t("مشغولة"), cleaning:t("تنظيف"),
    maintenance:t("صيانة"), out_of_service:t("خارج الخدمة"), archived:t("مؤرشفة"),
  };
  const MAINT_STATUS_LABELS:Record<string,string> = {
    open:t("مفتوح"), in_progress:t("قيد المعالجة"), waiting_parts:t("بانتظار قطع"),
    resolved:t("تم الإنجاز"), cancelled:t("ملغي"),
  };
  const MAINT_PRIORITY_LABELS:Record<string,string> = {
    low:t("منخفضة"), medium:t("متوسطة"), high:t("مرتفعة"), urgent:t("عاجلة"),
  };
  const MAINT_TYPE_LABELS:Record<string,string> = {
    electric:t("كهرباء"), plumbing:t("سباكة"), ac:t("تكييف"), internet:t("إنترنت"),
    furniture:t("أثاث"), appliance:t("جهاز/معدات"), door:t("أبواب وأقفال"),
    cleaning_damage:t("ملاحظة تنظيف/تلف"), other:t("أخرى"),
  };
  const PM_LABELS:Record<string,string> = {
    cash:t("نقدي"), electronic:t("إلكتروني"), room_account:t("على حساب الغرفة"),
  };

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms,        setRooms]        = useState<RoomItem[]>([]);
  const [foodOrders,   setFoodOrders]   = useState<FoodOrder[]>([]);
  const [tickets,      setTickets]      = useState<Ticket[]>([]);
  const [hotel,        setHotel]        = useState<HotelInfo|null>(null);
  const [loading,      setLoading]      = useState(true);

  const [period, setPeriod] = useState<TPeriod>("month");
  const [cfrom,  setCfrom]  = useState("");
  const [cto,    setCto]    = useState("");
  // §12.2: فلاتر تفصيلية (مصدر الحجز + الحالة)
  const [fSource, setFSource] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [tab,    setTab]    = useState<TTab>("overview");

  /* ── Fetch ── */
  function fetchAll(){
    if(!hotelId){setLoading(false);return;}
    setLoading(true);
    Promise.all([
      fetch(`${API}/reservations/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${API}/rooms/?hotel=${hotelId}`,        {headers:apiH()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${API}/maintenance/?hotel=${hotelId}`,  {headers:apiH()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${API}/hotels/${hotelId}/`,             {headers:apiH()}).then(r=>r.ok?r.json():null).catch(()=>null),
    ]).then(([rd,rmd,td,hd])=>{
      setReservations(Array.isArray(rd) ?rd :rd?.results ??[]);
      setRooms(       Array.isArray(rmd)?rmd:rmd?.results??[]);
      setTickets(     Array.isArray(td) ?td :td?.results ??[]);
      setHotel(hd);
      // Food orders are stored only in localStorage; map camelCase → snake_case
      type RawOrder = {
        id?: string|number; amount?: number|string; currency?: string;
        paymentMethod?: string; status?: string; createdAt?: string;
        sourceType?: string; roomNumber?: string; tableNumber?: string;
        guestName?: string; customerName?: string;
        items?: OrderItem[]|string;
      };
      let foodList: FoodOrder[] = [];
      try {
        const raw = localStorage.getItem(`fandqi.foodOrders.${hotelId}`) ?? "[]";
        const parsed: RawOrder[] = JSON.parse(raw);
        foodList = (Array.isArray(parsed)?parsed:[]).map((o,idx): FoodOrder => ({
          id:             typeof o.id === "number" ? o.id : idx+1,
          hotel:          Number(hotelId),
          guest_name:     o.guestName ?? o.customerName ?? null,
          room_number:    o.roomNumber ?? null,
          table_number:   o.tableNumber ?? null,
          payment_method: o.paymentMethod ?? "cash",
          status:         o.status ?? "delivered",
          items:          o.items,
          amount:         Number(o.amount ?? 0),
          currency:       o.currency,
          created_at:     o.createdAt ?? "",
          source_type:    o.sourceType,
        }));
      } catch { /* ignore parse errors */ }
      setFoodOrders(foodList);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ const execute = async () => { await fetchAll(); }; execute(); },[]);

  /* ── Date range ── */
  const{from:dateFrom,to:dateTo}=useMemo(()=>calcRange(period,cfrom,cto),[period,cfrom,cto]);

  /* ── Filtered ── */
  const nonArchivedRooms=useMemo(()=>rooms.filter(r=>r.status!=="archived"),[rooms]);

  const filteredRes=useMemo(()=>reservations.filter(r=>
    r.status!=="archived"&&(
      inRange(r.check_in_date,dateFrom,dateTo)||
      inRange(r.check_out_date,dateFrom,dateTo)||
      inRange(r.created_at??"",dateFrom,dateTo)
    )
    // §12.2: فلترة بمصدر الحجز (مباشر/موقع) والحالة
    && (fSource==="all" || (fSource==="website" ? (r.source==="website"||r.source==="public_website") : r.source===fSource))
    && (fStatus==="all" || r.status===fStatus)
  ),[reservations,dateFrom,dateTo,fSource,fStatus]);

  const filteredOrders=useMemo(()=>foodOrders.filter(o=>
    inRange(o.created_at,dateFrom,dateTo)
  ),[foodOrders,dateFrom,dateTo]);

  const filteredTickets=useMemo(()=>tickets.filter(t=>
    inRange(t.created_at,dateFrom,dateTo)||inRange(t.updated_at,dateFrom,dateTo)
  ),[tickets,dateFrom,dateTo]);

  /* ── Stats ── */
  const currency=reservations[0]?.currency||foodOrders[0]?.currency||getHotelCurrency(hotelId)||"USD";

  const resTotal     = useMemo(()=>filteredRes.reduce((s,r)=>s+n(r.total),0),[filteredRes]);
  const resPaid      = useMemo(()=>filteredRes.reduce((s,r)=>s+n(r.paid),0),[filteredRes]);
  const resRemaining = useMemo(()=>filteredRes.reduce((s,r)=>s+resBal(r),0),[filteredRes]);
  const foodTotal    = useMemo(()=>filteredOrders.reduce((s,o)=>s+n(o.amount),0),[filteredOrders]);
  const foodCash     = useMemo(()=>filteredOrders.filter(o=>o.payment_method==="cash").reduce((s,o)=>s+n(o.amount),0),[filteredOrders]);
  const foodElec     = useMemo(()=>filteredOrders.filter(o=>o.payment_method==="electronic").reduce((s,o)=>s+n(o.amount),0),[filteredOrders]);
  const foodRoomAcc  = useMemo(()=>filteredOrders.filter(o=>o.payment_method==="room_account").reduce((s,o)=>s+n(o.amount),0),[filteredOrders]);
  const totalMovement= resTotal+foodTotal;
  const roomsSold    = useMemo(()=>filteredRes.filter(r=>["checked_in","checked_out"].includes(r.status)).length,[filteredRes]);

  const occupiedCount  = useMemo(()=>nonArchivedRooms.filter(r=>r.status==="occupied").length,[nonArchivedRooms]);
  const cleaningCount  = useMemo(()=>nonArchivedRooms.filter(r=>r.status==="cleaning").length,[nonArchivedRooms]);
  const maintCount     = useMemo(()=>nonArchivedRooms.filter(r=>r.status==="maintenance").length,[nonArchivedRooms]);
  const availableCount = useMemo(()=>nonArchivedRooms.filter(r=>r.status==="available").length,[nonArchivedRooms]);
  const oosCount       = useMemo(()=>nonArchivedRooms.filter(r=>r.status==="out_of_service").length,[nonArchivedRooms]);
  const totalRooms     = nonArchivedRooms.length;
  const occupancyPct   = totalRooms>0?Math.round(occupiedCount/totalRooms*100):0;
  const adr            = roomsSold>0?Math.round(resTotal/roomsSold):0;
  const revpar         = totalRooms>0?Math.round(resTotal/totalRooms):0;
  const activeGuests   = useMemo(()=>reservations.filter(r=>r.status==="checked_in").length,[reservations]);
  const openTickets    = useMemo(()=>tickets.filter(t=>["open","in_progress","waiting_parts"].includes(t.status)).length,[tickets]);
  const opsLoad        = cleaningCount+maintCount+openTickets;

  /* ── Room → reservation map ── */
  const activeResByRoom=useMemo(()=>{
    const map=new Map<number,Reservation>();
    const pri=(s:string)=>({checked_in:0,confirmed:1,pending:2}[s]??9);
    [...reservations]
      .filter(r=>r.room&&["checked_in","confirmed","pending"].includes(r.status))
      .sort((a,b)=>pri(a.status)-pri(b.status))
      .forEach(r=>{if(r.room&&!map.has(r.room))map.set(r.room,r);});
    return map;
  },[reservations]);

  /* ── Top food items ── */
  const topItems=useMemo(()=>{
    const map=new Map<string,{qty:number,total:number}>();
    filteredOrders.forEach(o=>{
      parseItems(o.items).forEach(it=>{
        const prev=map.get(it.name)??{qty:0,total:0};
        map.set(it.name,{
          qty:  prev.qty  +(it.quantity??1),
          total:prev.total+((it.quantity??1)*(it.price??0)),
        });
      });
    });
    return [...map.entries()].sort((a,b)=>b[1].total-a[1].total||b[1].qty-a[1].qty).slice(0,10);
  },[filteredOrders]);

  /* ── Floor map ── */
  const floorMap=useMemo(()=>{
    const m=new Map<number,number>();
    nonArchivedRooms.forEach(r=>m.set(r.floor,(m.get(r.floor)??0)+1));
    return [...m.entries()].sort((a,b)=>a[0]-b[0]);
  },[nonArchivedRooms]);

  /* ── Period helpers ── */
  function setPeriodBtn(p:TPeriod){setPeriod(p);if(p!=="custom"){setCfrom("");setCto("");}}
  function onFromChange(v:string){setCfrom(v);setPeriod("custom");}
  function onToChange(v:string)  {setCto(v);  setPeriod("custom");}

  /* ── Print / CSV ── */
  function handlePrint(){
    doPrint(TAB_LABELS[tab],PERIOD_LABELS[period],dateFrom,dateTo,hotel,{
      resCount:filteredRes.length,totalMovement,occupancyPct,
      activeGuests,roomAccount:foodRoomAcc,remaining:resRemaining,currency,adr,revpar,
    });
  }
  function handleCSV(){
    const date=new Date().toISOString().split("T")[0];
    const fn=`fandqi-${tab}-${date}.csv`;
    if(tab==="overview"){
      dlCSV([
        ["البيان","القيمة"],
        ["عدد الحجوزات",String(filteredRes.length)],
        ["حجوزات مكتملة",String(filteredRes.filter(r=>r.status==="checked_out").length)],
        ["مقيمون حاليًا",String(activeGuests)],
        ["قيمة الحجوزات",String(resTotal)],
        ["مدفوع الحجز",String(resPaid)],
        ["المتبقي",String(resRemaining)],
        ["طلبات المطعم",String(foodTotal)],
        ["على حساب الغرف",String(foodRoomAcc)],
        ["طلبات مدفوعة",String(foodCash+foodElec)],
        ["إجمالي الحركة",String(totalMovement)],
        ["عدد الغرف",String(totalRooms)],
        ["مشغولة",String(occupiedCount)],
        ["نسبة الإشغال",`${occupancyPct}%`],
        ["نزلاء مقيمون",String(activeGuests)],
        ["غرف تنظيف",String(cleaningCount)],
        ["غرف صيانة",String(maintCount)],
        ["بلاغات مفتوحة",String(openTickets)],
        ["متوسط سعر الغرفة (ADR)",`${adr} ${currency}`],
        ["إيراد الغرفة المتاحة (RevPAR)",`${revpar} ${currency}`],
      ],fn);
    }else if(tab==="reservations"){
      dlCSV([
        ["رقم الحجز","النزيل","الغرفة","تاريخ الدخول","تاريخ الخروج","الحالة","الإجمالي","المدفوع","المتبقي"],
        ...filteredRes.map(r=>[
          r.booking_number,
          `${r.guest_first_name} ${r.guest_last_name}`.trim(),
          r.room_number??"—",
          r.check_in_date??"—",
          r.check_out_date??"—",
          RES_STATUS_LABELS[r.status]??r.status,
          String(n(r.total)),String(n(r.paid)),
          String(resBal(r)),
        ]),
      ],fn);
    }else if(tab==="financial"){
      dlCSV([
        ["رقم الطلب","النزيل","طريقة الدفع","الأصناف","المبلغ","التاريخ"],
        ...filteredOrders.map(o=>[
          orderNo(o.id),o.guest_name??"زبون مباشر",
          PM_LABELS[o.payment_method]??o.payment_method,
          parseItems(o.items).map(i=>i.name).join(" | "),
          String(n(o.amount)),o.created_at?.slice(0,10)??"—",
        ]),
      ],fn);
    }else if(tab==="rooms"){
      dlCSV([
        ["رقم الغرفة","الطابق","نوع الغرفة","حالة الغرفة"],
        ...nonArchivedRooms.map(r=>[
          r.number,String(r.floor),r.type??"—",ROOM_STATUS_LABELS[r.status]??r.status,
        ]),
      ],fn);
    }else if(tab==="food"){
      dlCSV([
        ["رقم الطلب","النزيل","المصدر","طريقة الدفع","الأصناف","المبلغ"],
        ...filteredOrders.map(o=>[
          orderNo(o.id),o.guest_name??"زبون مباشر",
          o.room_number?`غرفة ${o.room_number}`:o.table_number?`طاولة ${o.table_number}`:"غير محدد",
          PM_LABELS[o.payment_method]??o.payment_method,
          parseItems(o.items).map(i=>i.name).join(" | "),
          String(n(o.amount)),
        ]),
      ],fn);
    }else if(tab==="maintenance"){
      dlCSV([
        ["رقم البلاغ","الموقع","نوع المشكلة","الأولوية","الحالة","التاريخ"],
        ...filteredTickets.map(t=>[
          t.ticket_no,
          t.room_number?`غرفة ${t.room_number} - الطابق ${t.room_floor}`:"مرفق عام",
          MAINT_TYPE_LABELS[t.issue_type]??t.issue_type,
          MAINT_PRIORITY_LABELS[t.priority]??t.priority,
          MAINT_STATUS_LABELS[t.status]??t.status,
          t.created_at?.slice(0,10)??"—",
        ]),
      ],fn);
    }
  }

  /* ─── Empty state ─── */
  function renderEmptyState(){
    return(
      <div style={{background:"#f8fafc",border:"1px dashed #e2e8f0",borderRadius:12,
        padding:"3rem",textAlign:"center"}}>
        <BarChart3 size={44} strokeWidth={1.2} style={{marginBottom:10,color:"var(--color-muted)"}}/>
        <p style={{fontWeight:800,fontSize:16,color:"var(--color-heading)",marginBottom:6}}>
          {t("لا توجد بيانات ضمن الفترة المحددة")}
        </p>
        <p style={{fontSize:13,color:"var(--color-muted)"}}>
          {t("غيّر الفترة الزمنية أو أضف بيانات تشغيلية لعرض التقرير.")}
        </p>
      </div>
    );
  }

  /* ─── م7: تبويبات إضافية (§12.1) ─── */
  function renderLinkTab(label:string, href:string, desc:string){
    return (
      <div className="ds-card-p" style={{textAlign:"center",padding:"2.2rem 1rem"}}>
        <p style={{fontWeight:800,fontSize:15,marginBottom:"0.4rem",color:"var(--color-heading)"}}>{label}</p>
        <p className="text-muted" style={{fontSize:13,marginBottom:"1.1rem"}}>{desc}</p>
        <a href={href} className="ds-btn ds-btn-primary" style={{textDecoration:"none"}}>{t("افتح الصفحة الكاملة")} →</a>
      </div>
    );
  }
  function renderTabWebBookings(){
    const rows=filteredRes.filter(r=>r.source==="website"||r.source==="public_website");
    if(rows.length===0) return renderEmptyState();
    return (<div className="ds-card-p">
      <p style={{fontWeight:700,fontSize:13,marginBottom:"0.75rem"}}>{t("حجوزات الموقع")} · {rows.length}</p>
      <div className="ds-table-wrap"><table className="ds-table">
        <thead><tr><th>{t("الرقم")}</th><th>{t("النزيل")}</th><th>{t("التواريخ")}</th><th>{t("الحالة")}</th><th>{t("الإجمالي")}</th></tr></thead>
        <tbody>{rows.map(r=>(<tr key={r.id}>
          <td style={{fontWeight:700,fontSize:12}}>{r.booking_number}</td>
          <td>{`${r.guest_first_name} ${r.guest_last_name}`.trim()||"—"}</td>
          <td style={{fontSize:11}}>{r.check_in_date||"?"} ← {r.check_out_date||"?"}</td>
          <td>{RES_STATUS_LABELS[r.status]??r.status}</td>
          <td>{n(r.total).toLocaleString("en-US")} {currency}</td>
        </tr>))}</tbody>
      </table></div>
    </div>);
  }
  function renderTabGuests(){
    const map=new Map<string,{name:string;count:number;total:number}>();
    filteredRes.forEach(r=>{const k=`${r.guest_first_name} ${r.guest_last_name}`.trim()||"—";const e=map.get(k)??{name:k,count:0,total:0};e.count++;e.total+=n(r.total);map.set(k,e);});
    const rows=[...map.values()].sort((a,b)=>b.total-a.total);
    if(rows.length===0) return renderEmptyState();
    return (<div className="ds-card-p">
      <p style={{fontWeight:700,fontSize:13,marginBottom:"0.75rem"}}>{t("النزلاء")} · {rows.length}</p>
      <div className="ds-table-wrap"><table className="ds-table">
        <thead><tr><th>{t("النزيل")}</th><th>{t("عدد الحجوزات")}</th><th>{t("إجمالي القيمة")}</th></tr></thead>
        <tbody>{rows.map((g,i)=>(<tr key={i}><td>{g.name}</td><td>{g.count}</td><td>{g.total.toLocaleString("en-US")} {currency}</td></tr>))}</tbody>
      </table></div>
    </div>);
  }
  function renderTabFolio(){
    const rows=filteredRes.filter(r=>resBal(r)>0 && !["cancelled","no_show"].includes(r.status));
    if(rows.length===0) return renderEmptyState();
    return (<div className="ds-card-p">
      <p style={{fontWeight:700,fontSize:13,marginBottom:"0.75rem"}}>{t("الفوليو والذمم")} · {rows.length}</p>
      <div className="ds-table-wrap"><table className="ds-table">
        <thead><tr><th>{t("النزيل")}</th><th>{t("الغرفة")}</th><th>{t("الإجمالي")}</th><th>{t("المدفوع")}</th><th>{t("المتبقي")}</th></tr></thead>
        <tbody>{rows.map(r=>(<tr key={r.id}>
          <td>{`${r.guest_first_name} ${r.guest_last_name}`.trim()||"—"}</td>
          <td>{r.room_number??"—"}</td>
          <td>{n(r.total).toLocaleString("en-US")} {currency}</td>
          <td>{n(r.paid).toLocaleString("en-US")} {currency}</td>
          <td style={{color:"#dc2626",fontWeight:700}}>{resBal(r).toLocaleString("en-US")} {currency}</td>
        </tr>))}</tbody>
      </table></div>
    </div>);
  }
  function renderTabCleaning(){
    const rows=nonArchivedRooms.filter(r=>["cleaning","maintenance","out_of_service"].includes(r.status));
    if(rows.length===0) return renderEmptyState();
    return (<div className="ds-card-p">
      <p style={{fontWeight:700,fontSize:13,marginBottom:"0.75rem"}}>{t("التنظيف والصيانة")} · {rows.length}</p>
      <div className="ds-table-wrap"><table className="ds-table">
        <thead><tr><th>{t("الغرفة")}</th><th>{t("الطابق")}</th><th>{t("الحالة")}</th></tr></thead>
        <tbody>{rows.map(r=>(<tr key={r.id}><td>{r.number}</td><td>{r.floor}</td><td>{ROOM_STATUS_LABELS[r.status]??r.status}</td></tr>))}</tbody>
      </table></div>
    </div>);
  }

  /* ─── Tab: Overview ─── */
  function renderTabOverview(){
    const maxBar=Math.max(resTotal,foodTotal,foodRoomAcc,resRemaining,1);
    return(
      <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div className="ds-card-p">
          <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("ملخص مالي سريع")}</p>
          <Bar label={t("إجمالي قيمة الإقامات")}    count={resTotal}     max={maxBar} color="#6366f1" sub={currency}/>
          <Bar label={t("إيراد المطعم والكافتريا")} count={foodTotal}    max={maxBar} color="#22c55e" sub={currency}/>
          <Bar label={t("طلبات على حساب الغرفة")}   count={foodRoomAcc}  max={maxBar} color="#f59e0b" sub={currency}/>
          <Bar label={t("إجمالي المتبقي")}          count={resRemaining} max={maxBar} color="#dc2626" sub={currency}/>
        </div>
        <div className="ds-card-p">
          <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("حالة الغرف")}</p>
          <Bar label={t("متاحة")}        count={availableCount} max={totalRooms||1} color="#22c55e"/>
          <Bar label={t("مشغولة")}       count={occupiedCount}  max={totalRooms||1} color="#2563eb"/>
          <Bar label={t("قيد التنظيف")} count={cleaningCount}  max={totalRooms||1} color="#f59e0b"/>
          <Bar label={t("صيانة")}       count={maintCount}     max={totalRooms||1} color="#ea580c"/>
          <Bar label={t("خارج الخدمة")} count={oosCount}       max={totalRooms||1} color="#dc2626"/>
        </div>
        <div className="ds-card-p">
          <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("مؤشرات إدارية")}</p>
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {[
              {label:t("أقوى مصدر حركة"),                value:foodTotal>resTotal?t("المطعم والكافتريا"):t("الحجوزات"), note:t("حسب إجمالي الفترة")},
              {label:t("مخاطر الخروج"),                   value:money(resRemaining,currency), note:t("مبالغ يجب تحصيلها قبل المغادرة")},
              {label:t("ضغط التشغيل"),                   value: lang === "ar" ? `${cleaningCount+maintCount} غرفة` : `${cleaningCount+maintCount} rooms`, note:t("غرف تحتاج تنظيف أو صيانة")},
              {label:t("متوسط سعر الغرفة — ADR"),         value:money(adr,currency), note:t("إيراد الإقامة ÷ الغرف المباعة")},
              {label:t("إيراد الغرفة المتاحة — RevPAR"), value:money(revpar,currency), note:t("إيراد الإقامة ÷ إجمالي الغرف")},
            ].map(row=>(
              <div key={row.label} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",background:"#f8fafc",borderRadius:8,
                padding:"8px 12px",border:"1px solid #e2e8f0"}}>
                <div>
                  <p style={{fontSize:12,fontWeight:700,color:"var(--color-heading)"}}>{row.label}</p>
                  <p style={{fontSize:11,color:"var(--color-muted)"}}>{row.note}</p>
                </div>
                <span style={{fontWeight:900,fontSize:14,color:"#4f46e5"}}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Tab: Reservations ─── */
  function renderTabReservations(){
    if(filteredRes.length===0) return renderEmptyState();
    return(
      <div className="ds-card-p">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
          <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)"}}>{t("تقرير الحجوزات")}</p>
          <span style={{background:"#eff6ff",color:"#1d4ed8",border:"1px solid #bfdbfe",
            borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>
            {filteredRes.length}
          </span>
        </div>
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr><th>{t("الرقم")}</th><th>{t("النزيل")}</th><th>{t("الغرفة")}</th><th>{t("التواريخ")}</th>
                  <th>{t("الحالة")}</th><th>{t("الإجمالي")}</th><th>{t("المدفوع")}</th><th>{t("المتبقي")}</th></tr>
            </thead>
            <tbody>
              {[...filteredRes].sort((a,b)=>(b.check_in_date||"").localeCompare(a.check_in_date||"")).map(r=>{
                const rem=resBal(r);
                const ss=RES_STATUS_STYLE[r.status]??{background:"#f1f5f9",color:"#475569"};
                return(
                  <tr key={r.id}>
                    <td><span style={{fontWeight:700,fontSize:12}}>{r.booking_number}</span></td>
                    <td>{`${r.guest_first_name} ${r.guest_last_name}`.trim()||"—"}</td>
                    <td>{r.room_number
                      ? (lang === "ar" ? `غرفة ${r.room_number}` : `Room ${r.room_number}`)
                      : "—"}</td>
                    <td style={{fontSize:11}}>{r.check_in_date||"?"} ← {r.check_out_date||"?"}</td>
                    <td><span style={{...ss,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>
                      {RES_STATUS_LABELS[r.status]??r.status}
                    </span></td>
                    <td style={{fontWeight:700}}>{money(r.total,r.currency||currency)}</td>
                    <td style={{color:"#15803d",fontWeight:700}}>{money(r.paid,r.currency||currency)}</td>
                    <td>{rem>0
                      ?<span style={{color:"#b91c1c",fontWeight:700}}>{money(rem,r.currency||currency)}</span>
                      :<span style={{color:"var(--color-muted)"}}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ─── Tab: Financial ─── */
  function renderTabFinancial(){
    const roomAccOrders=filteredOrders.filter(o=>o.payment_method==="room_account");
    return(
      <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div className="ds-card-p">
          <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("تفصيل الحسابات المالية")}</p>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead><tr><th>{t("البند")}</th><th>{t("القيمة")}</th><th>{t("ملاحظة")}</th></tr></thead>
              <tbody>
                {[
                  {k:t("إجمالي قيمة الإقامات"),     v:resTotal,    note:t("قيمة الحجوزات ضمن الفترة")},
                  {k:t("مدفوعات الحجوزات"),          v:resPaid,     note:t("المبالغ المسددة من الحجوزات")},
                  {k:t("طلبات نقدية"),               v:foodCash,    note:t("مطعم وكافتريا نقدي")},
                  {k:t("طلبات إلكترونية"),           v:foodElec,    note:t("مطعم وكافتريا إلكتروني")},
                  {k:t("طلبات على حساب الغرفة"),     v:foodRoomAcc, note:t("تضاف إلى كشف حساب النزيل")},
                  {k:t("إجمالي المتبقي"),            v:resRemaining,note:t("يمنع الخروج عند وجود متبقي")},
                ].map(row=>(
                  <tr key={row.k}>
                    <td style={{fontWeight:700}}>{row.k}</td>
                    <td style={{fontWeight:900,color:"#4f46e5"}}>{money(row.v,currency)}</td>
                    <td style={{fontSize:11,color:"var(--color-muted)"}}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {roomAccOrders.length>0&&(
          <div className="ds-card-p">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
              <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)"}}>{t("طلبات مرحلة على حساب الغرف")}</p>
              <span style={{background:"#fef9c3",color:"#854d0e",border:"1px solid #fde68a",
                borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>
                {roomAccOrders.length}
              </span>
            </div>
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead><tr><th>{t("الرقم")}</th><th>{t("النزيل")}</th><th>{t("الغرفة")}</th><th>{t("البند")}</th><th>{t("الإجمالي")}</th></tr></thead>
                <tbody>
                  {roomAccOrders.map(o=>(
                    <tr key={o.id}>
                      <td style={{fontWeight:700,fontSize:12}}>{orderNo(o.id)}</td>
                      <td>{o.guest_name||(lang === "ar" ? "زبون مباشر" : "Walk-in")}</td>
                      <td>{o.room_number
                        ? (lang === "ar" ? `غرفة ${o.room_number}` : `Room ${o.room_number}`)
                        : "—"}</td>
                      <td style={{fontSize:11}}>{parseItems(o.items).map(i=>i.name).join("، ")||"—"}</td>
                      <td style={{fontWeight:700,color:"#854d0e"}}>{money(o.amount,o.currency||currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {filteredOrders.length===0&&renderEmptyState()}
      </div>
    );
  }

  /* ─── Tab: Rooms ─── */
  function renderTabRooms(){
    const sorted=[...nonArchivedRooms].sort((a,b)=>{
      if(a.floor!==b.floor) return a.floor-b.floor;
      return parseInt(a.number.replace(/\D/g,"")||"0")-parseInt(b.number.replace(/\D/g,"")||"0");
    });
    return(
      <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div className="ds-card-p">
          <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("توزيع الغرف حسب الطوابق")}</p>
          {floorMap.map(([floor,count])=>(
            <Bar key={floor} label={lang === "ar" ? `الطابق ${floor}` : `Floor ${floor}`} count={count} max={totalRooms||1} color="#6366f1" sub={lang === "ar" ? "غرفة" : "rooms"}/>
          ))}
          {floorMap.length===0&&<p style={{color:"var(--color-muted)",fontSize:13}}>{t("لا توجد غرف مسجلة.")}</p>}
        </div>
        <div className="ds-card-p">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
            <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)"}}>{t("تقرير الغرف")}</p>
            <span style={{background:"#eff6ff",color:"#1d4ed8",border:"1px solid #bfdbfe",
              borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>
              {sorted.length}
            </span>
          </div>
          {sorted.length===0?renderEmptyState():(
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr><th>{t("الغرفة")}</th><th>{t("الطابق")}</th><th>{t("النوع")}</th><th>{t("الحالة")}</th><th>{t("النزيل")}</th><th>{t("الحجز")}</th></tr>
                </thead>
                <tbody>
                  {sorted.map(r=>{
                    const ar=activeResByRoom.get(r.id);
                    const sc=ROOM_STATUS_COLOR[r.status]??"#94a3b8";
                    return(
                      <tr key={r.id}>
                        <td style={{fontWeight:700}}>{lang === "ar" ? `غرفة ${r.number}` : `Room ${r.number}`}</td>
                        <td>{lang === "ar" ? `الطابق ${r.floor}` : `Floor ${r.floor}`}</td>
                        <td style={{fontSize:12}}>{r.type||"—"}</td>
                        <td><span style={{background:`${sc}22`,color:sc,padding:"2px 8px",
                          borderRadius:20,fontSize:10,fontWeight:700,border:`1px solid ${sc}44`}}>
                          {ROOM_STATUS_LABELS[r.status]??r.status}
                        </span></td>
                        <td style={{fontSize:12}}>{ar?`${ar.guest_first_name} ${ar.guest_last_name}`.trim():"—"}</td>
                        <td style={{fontSize:11,color:"var(--color-muted)"}}>{ar?.booking_number||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Tab: Food ─── */
  function renderTabFood(){
    const pmC=countBy(filteredOrders,o=>o.payment_method);
    const maxPm=Math.max(...Object.values(pmC),1);
    const recent=[...filteredOrders].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,20);
    return(
      <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div className="ds-card-p">
          <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("طلبات المطعم حسب الدفع")}</p>
          <Bar label={t("نقدي")}               count={pmC["cash"]        ??0} max={maxPm} color="#22c55e" sub={t("طلب")}/>
          <Bar label={t("إلكتروني")}           count={pmC["electronic"]  ??0} max={maxPm} color="#2563eb" sub={t("طلب")}/>
          <Bar label={t("على حساب الغرفة")}   count={pmC["room_account"]??0} max={maxPm} color="#f59e0b" sub={t("طلب")}/>
        </div>
        {topItems.length>0&&(
          <div className="ds-card-p">
            <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("الأصناف الأكثر طلبًا")}</p>
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead><tr><th>#</th><th>{t("البند")}</th><th>{t("الكمية")}</th><th>{t("الإجمالي")}</th></tr></thead>
                <tbody>
                  {topItems.map(([name,{qty,total:tt}],i)=>(
                    <tr key={name}>
                      <td style={{color:"var(--color-muted)",fontSize:12}}>{i+1}</td>
                      <td style={{fontWeight:700}}>{name}</td>
                      <td>{qty}</td>
                      <td style={{fontWeight:700}}>{tt>0?money(tt,currency):"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {recent.length>0&&(
          <div className="ds-card-p">
            <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("سجل طلبات المطعم والكافتريا")}</p>
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr><th>{t("الرقم")}</th><th>{t("النزيل")}</th><th>{t("المصدر")}</th><th>{t("طريقة الدفع")}</th><th>{t("البند")}</th><th>{t("الإجمالي")}</th></tr>
                </thead>
                <tbody>
                  {recent.map(o=>{
                    const loc=o.room_number
                      ? (lang === "ar" ? `غرفة ${o.room_number}` : `Room ${o.room_number}`)
                      : o.table_number
                      ? (lang === "ar" ? `طاولة ${o.table_number}` : `Table ${o.table_number}`)
                      : t("غير محدد");
                    const ps=o.payment_method==="room_account"
                      ?{background:"#fef9c3",color:"#854d0e"}
                      :o.payment_method==="electronic"
                      ?{background:"#dbeafe",color:"#1d4ed8"}
                      :{background:"#dcfce7",color:"#15803d"};
                    return(
                      <tr key={o.id}>
                        <td style={{fontWeight:700,fontSize:12}}>{orderNo(o.id)}</td>
                        <td style={{fontSize:12}}>{o.guest_name||(lang === "ar" ? "زبون مباشر" : "Walk-in")}</td>
                        <td style={{fontSize:12}}>{loc}</td>
                        <td><span style={{...ps,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>
                          {PM_LABELS[o.payment_method]??o.payment_method}
                        </span></td>
                        <td style={{fontSize:11}}>{parseItems(o.items).map(i=>i.name).join("، ")||"—"}</td>
                        <td style={{fontWeight:700}}>{money(o.amount,o.currency||currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {filteredOrders.length===0&&renderEmptyState()}
      </div>
    );
  }

  /* ─── Tab: Maintenance ─── */
  function renderTabMaintenance(){
    const sc=countBy(filteredTickets,t=>t.status);
    const pc=countBy(filteredTickets,t=>t.priority);
    const maxS=Math.max(...Object.values(sc),1);
    const maxP=Math.max(...Object.values(pc),1);
    return(
      <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <div className="ds-card-p">
            <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("الصيانة حسب الحالة")}</p>
            {(["open","in_progress","waiting_parts","resolved","cancelled"]).map(s=>(
              <Bar key={s} label={MAINT_STATUS_LABELS[s]} count={sc[s]??0} max={maxS} color={MAINT_STATUS_COLOR[s]}/>
            ))}
          </div>
          <div className="ds-card-p">
            <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("الصيانة حسب الأولوية")}</p>
            {(["urgent","high","medium","low"]).map(p=>(
              <Bar key={p} label={MAINT_PRIORITY_LABELS[p]} count={pc[p]??0} max={maxP} color={MAINT_PRIORITY_COLOR[p]}/>
            ))}
          </div>
        </div>
        {filteredTickets.length===0?renderEmptyState():(
          <div className="ds-card-p">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
              <p style={{fontWeight:700,fontSize:13,color:"var(--color-heading)"}}>{t("سجل بلاغات الصيانة")}</p>
              <span style={{background:"#eff6ff",color:"#1d4ed8",border:"1px solid #bfdbfe",
                borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>
                {filteredTickets.length}
              </span>
            </div>
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr><th>{t("الرقم")}</th><th>{t("الموقع")}</th><th>{t("النوع")}</th><th>{t("الأولوية")}</th><th>{t("الحالة")}</th><th>{t("المسؤول")}</th><th>{t("التاريخ")}</th></tr>
                </thead>
                <tbody>
                  {[...filteredTickets].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(tk=>{
                    const ss={background:`${MAINT_STATUS_COLOR[tk.status]}22`,color:MAINT_STATUS_COLOR[tk.status],border:`1px solid ${MAINT_STATUS_COLOR[tk.status]}44`};
                    const ps={background:`${MAINT_PRIORITY_COLOR[tk.priority]}22`,color:MAINT_PRIORITY_COLOR[tk.priority],border:`1px solid ${MAINT_PRIORITY_COLOR[tk.priority]}44`};
                    return(
                      <tr key={tk.id}>
                        <td style={{fontWeight:700,fontSize:12}}>{tk.ticket_no}</td>
                        <td style={{fontSize:12}}>{tk.room_number
                          ? (lang === "ar"
                            ? `غرفة ${tk.room_number} - الطابق ${tk.room_floor}`
                            : `Room ${tk.room_number} - Floor ${tk.room_floor}`)
                          : t("مرفق عام")}</td>
                        <td style={{fontSize:12}}>{MAINT_TYPE_LABELS[tk.issue_type]??tk.issue_type}</td>
                        <td><span style={{...ps,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>
                          {MAINT_PRIORITY_LABELS[tk.priority]??tk.priority}
                        </span></td>
                        <td><span style={{...ss,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>
                          {MAINT_STATUS_LABELS[tk.status]??tk.status}
                        </span></td>
                        <td style={{fontSize:12}}>{tk.assigned_to_name||"—"}</td>
                        <td style={{fontSize:11,color:"var(--color-muted)"}}>{fmtDate(tk.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════ RENDER ═════════ */
  return(
    <div className="ds-page">

      {/* ── Header ── */}
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"0.65rem",marginBottom:"0.3rem"}}>
              <div style={{width:36,height:36,borderRadius:10,
                background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <BarChart3 size={18} color="#fff" strokeWidth={2} />
              </div>
              <h1 style={{fontSize:"var(--text-2xl)",fontWeight:900,color:"var(--color-heading)"}}>{t("التقارير")}</h1>
            </div>
            <p style={{fontSize:13,color:"var(--color-muted)",paddingRight:"0.25rem"}}>
              {t("تقارير تشغيلية ومالية مختصرة تساعد الإدارة على قراءة أداء الفندق بسرعة وبدقة.")}
            </p>
          </div>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",alignItems:"center"}}>
            {/* Mini stats */}
            {[
              {label:t("الحجوزات"),       value:String(filteredRes.length)},
              {label:t("إجمالي الحركة"), value:money(totalMovement,currency)},
              {label:t("نسبة الإشغال"),  value:`${occupancyPct}%`},
            ].map(s=>(
              <div key={s.label} style={{background:"#f1f5f9",borderRadius:10,
                padding:"5px 10px",textAlign:"center"}}>
                <p style={{fontSize:10,color:"var(--color-muted)",marginBottom:1}}>{s.label}</p>
                <p style={{fontSize:13,fontWeight:900,color:"var(--color-heading)"}}>{s.value}</p>
              </div>
            ))}
            <button onClick={handlePrint}
              style={{background:"#f1f5f9",color:"#1e293b",border:"1px solid #e2e8f0",
                borderRadius:8,padding:"0.45rem 0.85rem",fontSize:12,fontWeight:700,cursor:"pointer",
                display:"flex",alignItems:"center",gap:5}}>
              <Printer size={13}/> {t("طباعة التقرير")}
            </button>
            <button onClick={handleCSV}
              style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",
                border:"none",borderRadius:8,padding:"0.45rem 0.85rem",
                fontSize:12,fontWeight:700,cursor:"pointer"}}>
              <Download size={13}/> {t("تصدير CSV")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"0.65rem",marginBottom:"1.5rem"}}>
        {([
          {label:t("الحجوزات"),        value:String(filteredRes.length),    sub:t("ضمن الفترة المحددة"),           Icon:Calendar  as LucideIcon, grad:"linear-gradient(135deg,#6366f1,#4f46e5)", targetTab:"reservations" as TTab},
          {label:t("إجمالي الحركة"),  value:money(totalMovement,currency),  sub:t("إقامة + طلبات"),               Icon:Banknote   as LucideIcon, grad:"linear-gradient(135deg,#22c55e,#16a34a)", targetTab:"financial"     as TTab},
          {label:t("نسبة الإشغال"),   value:`${occupancyPct}%`,            sub: lang === "ar" ? `${occupiedCount}/${totalRooms} غرفة` : `${occupiedCount}/${totalRooms} rooms`, Icon:Building2 as LucideIcon, grad:"linear-gradient(135deg,#06b6d4,#0891b2)", targetTab:"rooms"        as TTab},
          {label:t("النزلاء المقيمون"),value:String(activeGuests),           sub:t("حسب الحجوزات الحالية"),         Icon:Users      as LucideIcon, grad:"linear-gradient(135deg,#8b5cf6,#7c3aed)", targetTab:"reservations" as TTab},
          {label:t("على حساب الغرف"), value:money(foodRoomAcc,currency),    sub:t("طلبات غير مدفوعة مباشرة"),     Icon:Home       as LucideIcon, grad:"linear-gradient(135deg,#f59e0b,#d97706)", targetTab:"food"         as TTab},
          {label:t("متابعة تشغيلية"), value:String(opsLoad),               sub:t("تنظيف وصيانة وبلاغات مفتوحة"), Icon:Settings   as LucideIcon, grad:"linear-gradient(135deg,#ef4444,#dc2626)", targetTab:"maintenance"  as TTab},
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;targetTab:TTab}[]).map(s=>(
          <div key={s.label} className="ds-kpi-card" onClick={()=>setTab(s.targetTab)}
            style={{background:s.grad,borderRadius:12,padding:"0.85rem 0.7rem",color:"#fff",cursor:"pointer",position:"relative",transition:"transform .15s,box-shadow .15s",...(tab===s.targetTab?{transform:"translateY(-3px) scale(1.02)",boxShadow:"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)"}:{})}}>
            {tab===s.targetTab&&<span style={{position:"absolute",top:"0.4rem",left:"0.5rem",fontSize:"0.55rem",fontWeight:700,background:"rgba(255,255,255,.25)",padding:"0.1rem 0.4rem",borderRadius:"1rem"}}>● {t("نشط")}</span>}
            <div className="ds-kpi-icon"><s.Icon size={24} strokeWidth={1.6} /></div>
            <p style={{fontSize:13,fontWeight:700,opacity:.90,marginBottom:4}}>{s.label}</p>
            <p style={{fontSize:15,fontWeight:900,lineHeight:1.3,marginBottom:2,wordBreak:"break-all"}}>{s.value}</p>
            <p style={{fontSize:9,opacity:.75}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Period filter ── */}
      <div className="ds-card-p" style={{marginBottom:"1.25rem"}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:"0.75rem",flexWrap:"wrap"}}>
          <div>
            <p style={{fontSize:11,color:"var(--color-muted)",marginBottom:"0.35rem",fontWeight:600}}>{t("الفترة")}</p>
            <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap"}}>
              {([
                {value:"today" as TPeriod, label:t("اليوم")},
                {value:"last7" as TPeriod, label:t("آخر 7 أيام")},
                {value:"month" as TPeriod, label:t("هذا الشهر")},
                {value:"custom"as TPeriod, label:t("فترة مخصصة")},
              ]).map(p=>(
                <button key={p.value} onClick={()=>setPeriodBtn(p.value)}
                  style={{padding:"0.38rem 0.75rem",borderRadius:8,fontSize:12,fontWeight:700,
                    cursor:"pointer",transition:"all .15s",
                    border:period===p.value?"2px solid #4f46e5":"1px solid #e2e8f0",
                    background:period===p.value?"#eff6ff":"#f8fafc",
                    color:period===p.value?"#4f46e5":"#475569"}}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{fontSize:11,color:"var(--color-muted)",marginBottom:"0.35rem"}}>{t("من تاريخ")}</p>
            <input className="input" type="date"
              value={period==="custom"?cfrom:dateFrom}
              onChange={e=>onFromChange(e.target.value)}
              style={{fontSize:12}} />
          </div>
          <div>
            <p style={{fontSize:11,color:"var(--color-muted)",marginBottom:"0.35rem"}}>{t("إلى تاريخ")}</p>
            <input className="input" type="date"
              value={period==="custom"?cto:dateTo}
              onChange={e=>onToChange(e.target.value)}
              style={{fontSize:12}} />
          </div>
          {/* §12.2: فلاتر مصدر الحجز والحالة */}
          <div>
            <p style={{fontSize:11,color:"var(--color-muted)",marginBottom:"0.35rem"}}>{t("مصدر الحجز")}</p>
            <select className="select" value={fSource} onChange={e=>setFSource(e.target.value)} style={{fontSize:12}}>
              <option value="all">{t("الكل")}</option>
              <option value="direct">{t("مباشر")}</option>
              <option value="website">{t("موقع")}</option>
            </select>
          </div>
          <div>
            <p style={{fontSize:11,color:"var(--color-muted)",marginBottom:"0.35rem"}}>{t("الحالة")}</p>
            <select className="select" value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{fontSize:12}}>
              <option value="all">{t("الكل")}</option>
              <option value="confirmed">{t("مؤكد")}</option>
              <option value="checked_in">{t("مسجل الدخول")}</option>
              <option value="checked_out">{t("تم المغادرة")}</option>
              <option value="cancelled">{t("ملغى")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ds-card-p" style={{marginBottom:"1rem"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"0.5rem",flexWrap:"wrap"}}>
          <div className="ds-tabs" style={{flex:1}}>
            {(["overview","reservations","web","guests","rooms","financial","folio","food","cleaning","maintenance","lostfound","staff","shifts","dayclose","audit","dues"] as TTab[]).map(tt=>(
              <button key={tt}
                className={`ds-tab-btn${tab===tt?" active":""}`}
                onClick={()=>setTab(tt)}>
                {TAB_LABELS[tt]}
              </button>
            ))}
          </div>
          {/* §ثانيًا‑3: أُزيلت أزرار الطباعة لكل تبويب — زر واحد أعلى الصفحة يطبع التبويب النشط عبر handlePrint */}
        </div>
      </div>

      {/* ── Body ── */}
      {loading?(
        <p style={{color:"var(--color-muted)",textAlign:"center",padding:"2.5rem"}}>
          {t("جاري تحميل بيانات التقارير...")}
        </p>
      ):(
        <>
          {tab==="overview"     &&renderTabOverview()}
          {tab==="reservations" &&renderTabReservations()}
          {tab==="financial"    &&renderTabFinancial()}
          {tab==="rooms"        &&renderTabRooms()}
          {tab==="food"         &&renderTabFood()}
          {tab==="maintenance"  &&renderTabMaintenance()}
          {tab==="web"          &&renderTabWebBookings()}
          {tab==="guests"       &&renderTabGuests()}
          {tab==="folio"        &&renderTabFolio()}
          {tab==="cleaning"     &&renderTabCleaning()}
          {tab==="lostfound"    &&renderLinkTab(t("المفقودات"), "/manager/lost-found", t("سجل الأغراض المفقودة والمُسلَّمة."))}
          {tab==="staff"        &&renderLinkTab(t("الموظفون"), "/manager/staff", t("قائمة الموظفين وحساباتهم وصلاحياتهم."))}
          {tab==="shifts"       &&renderLinkTab(t("الورديات"), "/manager/shift-handover", t("تقارير الورديات وتسليمها."))}
          {tab==="dayclose"     &&renderLinkTab(t("التدقيق اليومي"), "/manager/night-audit", t("فحص وإغلاق اليوم وتقاريره."))}
          {tab==="audit"        &&renderLinkTab(t("سجل النشاط"), "/manager/audit", t("سجلّ العمليات الحسّاسة (من فعل ماذا ومتى)."))}
          {tab==="dues"         &&renderLinkTab(t("مستحقات المنصة"), "/manager/web-bookings", t("عمولات حجوزات الموقع المستحقة للمنصّة."))}
        </>
      )}
    </div>
  );
}
