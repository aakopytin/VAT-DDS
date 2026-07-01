const https = require('https');
const ALLOWED = ['plan_money','transaction','categories','transaction_pls'];
const PAGE_SIZE = 100;

function readBody(req){
return new Promise(function(resolve){
var d='';
req.on('data',function(c){d+=c.toString();});
req.on('end',function(){resolve(d);});
req.on('error',function(){resolve('');});
});
}

function parseForm(body){
var r={};
if(!body)return r;
body.split('&').forEach(function(pair){
var i=pair.indexOf('=');
if(i<0)return;
r[decodeURIComponent(pair.slice(0,i).replace(/\+/g,' '))]=
decodeURIComponent(pair.slice(i+1).replace(/\+/g,' '));
});
return r;
}

function httpsGet(url){
return new Promise(function(resolve,reject){
https.get(url,function(resp){
var data='';
resp.on('data',function(c){data+=c;});
resp.on('end',function(){
try{resolve(JSON.parse(data));}
catch(e){reject(new Error('JSON: '+e.message));}
});
}).on('error',reject);
});
}

async function handler(req,res){
res.setHeader('X-Frame-Options','ALLOWALL');
res.setHeader('Content-Security-Policy',"frame-ancestors *");
res.setHeader('Cache-Control','no-store');
res.setHeader('Access-Control-Allow-Origin','*');

if(req.method==='GET'){
var rawUrl=req.url||'';
var qs=new URLSearchParams(rawUrl.includes('?')?rawUrl.split('?')[1]:'');
var qObj=req.query||{};
function gp(k){return qObj[k]||qs.get(k)||'';}
var action=gp('action');

if(action==='data'){
res.setHeader('Content-Type','application/json; charset=utf-8');
var apiKey=process.env.ASPRO_API_KEY;
if(!apiKey){res.statusCode=500;return res.end(JSON.stringify({error:'ASPRO_API_KEY not set'}));}
var entity=gp('entity');
var domain=gp('domain');
if(!entity||!ALLOWED.includes(entity)){res.statusCode=400;return res.end(JSON.stringify({error:'bad entity',entity:entity}));}
if(!domain){res.statusCode=400;return res.end(JSON.stringify({error:'domain required'}));}
var cleanDomain=domain.replace(/^https?:\/\//i,'').replace(/\/+$/,'');
var base='https://'+cleanDomain+'/api/v1/module/fin/'+entity+'/list?api_key='+encodeURIComponent(apiKey)+'&limit='+PAGE_SIZE;
try{
var d0=await httpsGet(base+'&page=1');
if(!d0.response){res.statusCode=502;return res.end(JSON.stringify({error:'aspro_error',raw:d0}));}
var first=d0.response.items||[];
var total=d0.response.total||0;
if(first.length===0||total<=PAGE_SIZE){return res.end(JSON.stringify({items:first,total:total}));}
var pages=Math.ceil(total/PAGE_SIZE);
var all=[].concat(first);
for(var p=2;p<=Math.min(pages,60);p++){
var dp=await httpsGet(base+'&page='+p);
var it=(dp.response&&dp.response.items)||[];
if(!it.length)break;
all=all.concat(it);
}
return res.end(JSON.stringify({items:all,total:total}));
}catch(err){res.statusCode=502;return res.end(JSON.stringify({error:err.message}));}
}

res.setHeader('Content-Type','text/html; charset=utf-8');
return res.end('<html><body style="font-family:sans-serif;padding:20px"><h3>&#x2713; ДДС виджет работает</h3></body></html>');
}

if(req.method!=='POST'){
res.setHeader('Content-Type','text/html; charset=utf-8');
return res.end('<html><body style="font-family:sans-serif;padding:20px"><h3>&#x2713; ДДС виджет работает</h3></body></html>');
}

res.setHeader('Content-Type','text/html; charset=utf-8');
var raw=await readBody(req);
var fields=parseForm(raw);
var domain=fields['domain']||'';
var accountId=fields['account[id]']||'';
var accessToken=fields['auth[access_token]']||'';
var vercelHost=req.headers['host']||'';
console.log('[DDS] POST | domain:',domain,'| acct:',accountId,'| host:',vercelHost);
return res.end(html(domain,accountId,accessToken,vercelHost));
}

handler.config={api:{bodyParser:false}};
module.exports=handler;

function esc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$/g,'\\$');}

function html(domain,accountId,accessToken,vercelHost){
return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ДДС</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;background:#f8f9fd;color:#111827;padding:10px}
table{width:100%;border-collapse:collapse}
td{padding:3px 5px}
td.v{text-align:right;white-space:nowrap}
details summary{font-size:10px;color:#9ca3af;cursor:pointer;padding:4px 0}
</style>
</head>
<body>
<div id="filters" style="display:flex;gap:6px;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e5e7eb">
<select id="qs" style="font-size:11px;border:1px solid #d1d5db;border-radius:3px;padding:2px 6px;color:#374151;background:#fff;cursor:pointer"></select>
</div>
<div id="root" style="color:#9ca3af">ДДС — загрузка…</div>
<script>
var DOMAIN="${esc(domain)}";
var ACCOUNT_ID="${esc(accountId)}";
var TOKEN="${esc(accessToken)}";
var API_BASE="${esc(vercelHost)}"?"https://${esc(vercelHost)}":(location.origin||"");
var VSIP={2:1,4:1,5:1,6:1,7:1,8:1};
var TT={18:1};
var OFF={24:1,26:1};
var PN={1:"Кемерово",3:"Южно-Сахалинск",10:"Большое Болдино",25:"Южно-Сахалинск",13:"Барнаул",12:"Киров",
23:"Сыктывкар",9:"Рузаевка",7:"Иволгинск",6:"Десногорск",
102:"Голутвинский",100:"Центральный договор",101:"Прочие проекты"};
var PO=[1,3,10,13,12,23,9,7,6,102,100,101];
var PG={2:100,4:101,18:100,19:100,21:101,29:100,30:100,31:100,32:100,33:102,17:101,20:101,22:101};
var AC={
"Перевод между счетами (поступление)":"tr","Перевод между счетами (списание)":"tr",
"Получение кредита":"skIn","Выплата кредита":"skOut",
"Оказание услуг":"pjIn","Оказание услуг проекту":"pjIn","Возврат ДС. за заказы":"refund",
"Проценты к получению":"pr","НДС исходящий":"pr","Налог - НДС":"pr",
"Зарплата":"zp","Налоги с зарплаты":"zp","Командировки":"km","Страхование":"ins",
"Расходы на услуги банков":"bk","Банковские услуги":"bk",
"Расходы на лизинг":"lz","Аренда":"ar","Бухгалтерия":"buh",
"Налоги и взносы":"ntax","Налоги - НДС":"ntax",
"Прочее":"po","Интернет и связь":"po","Проценты к уплате":"pct",
"Оборудование":"po","Возвраты клиентам":"pjOut","Нераспределенные":"po",
"Нераспределенные (списание)":"po","Офис":"po",
"СМР (Без детализации)":"pjOut","СМР Вент+кондиц":"pjOut",
"Материалы (Вентиляция)":"pjOut","Материалы (Отопление)":"pjOut",
"Материалы (Потолки)":"pjOut","Материалы (Проемы)":"pjOut",
"Материалы (Стены)":"pjOut","Материалы (Транспорт, Логистика)":"pjOut",
"Материалы (Электрика)":"pjOut","Материалы черновые":"pjOut",
"Проектирование-Изыскание":"pjOut",
"Составление исполнительной документации":"svc",
"Услуги по сертификации":"svc","Тесты и испытания":"svc","Банковские гарантии":"bg"
};

function fmt(v){if(!v&&v!==0)return"—";if(v===0)return"—";return new Intl.NumberFormat("ru-RU",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v);}
function fmtI(v){return new Intl.NumberFormat("ru-RU",{minimumFractionDigits:0,maximumFractionDigits:0}).format(v||0);}
function num(s){if(!s&&s!==0)return 0;return parseFloat(String(s).replace(/[^\\d.\\-]/g,""))||0;}
function getRange(){
var qs=document.getElementById("qs");
var val=qs?qs.value:"";
var now=new Date(),y=now.getFullYear(),q=Math.ceil((now.getMonth()+1)/3);
if(val){var pts=val.split(":");y=parseInt(pts[0],10);q=parseInt(pts[1],10);}
var s0=[y+"-01-01",y+"-04-01",y+"-07-01",y+"-10-01"][q-1];
var s1=[y+"-03-31",y+"-06-30",y+"-09-30",y+"-12-31"][q-1];
return{ymd:s0.slice(0,7),s0:s0,s1:s1,
d0:s0.slice(8)+"."+s0.slice(5,7)+"."+s0.slice(0,4),
d1:s1.slice(8)+"."+s1.slice(5,7)+"."+s1.slice(0,4),
label:"К"+q+" "+y};
}

function loadAll(entity){
var url=API_BASE+'?action=data&entity='+encodeURIComponent(entity)+'&domain='+encodeURIComponent(DOMAIN);
return fetch(url).then(function(r){
if(!r.ok)throw new Error('HTTP '+r.status);
return r.json();
}).then(function(d){
if(d.error)throw new Error(d.error+(d.raw?' | '+JSON.stringify(d.raw):''));
return d.items||[];
});
}

function calc(txMonth,txAll,cats,rng){
var cMap={};cats.forEach(function(c){cMap[c.id]=c.name||"";});

// Running balance up to period end
var vEnd=0,tEnd=0;
txAll.forEach(function(tx){
if(!tx.date||tx.date>rng.s1)return;
var aid=tx.org_account_id,inc=num(tx.income)||0,out=num(tx.outcome)||0;
if(VSIP[aid])vEnd+=inc-out;if(TT[aid])tEnd+=inc-out;
});

// Per-company income/expense for the period
var vPr=0,tPr=0,vZp=0,tZp=0,vKm=0,tKm=0,vBk=0,tBk=0;
var vIns=0,tIns=0,vLz=0,tLz=0,vAr=0,tAr=0,vBuh=0,tBuh=0;
var vNtax=0,tNtax=0,vPo=0,tPo=0,vPct=0,tPct=0,vBg=0,tBg=0;
var vPoIn=0,tPoIn=0,vPjIn=0,tPjIn=0,vPjOut=0,tPjOut=0;
var vRefund=0,tRefund=0;
var vTrIn=0,tTrIn=0,vTrOut=0,tTrOut=0;
var vSkIn=0,tSkIn=0,vSkOut=0,tSkOut=0;
var vPiP={},tPiP={},vPoP={},tPoP={},poDet=[];

txMonth.forEach(function(tx){
var aid=tx.org_account_id,cn=cMap[tx.category_id]||"";
var pid=tx.project_id||0,inc=num(tx.income)||0,out=num(tx.outcome)||0;
var isV=!!VSIP[aid],isT=!!TT[aid];if(!isV&&!isT)return;
var rp=pid,gp=(rp&&PG[rp])?PG[rp]:rp;
var pOk=gp&&!!PN[gp],pOff=rp&&!!OFF[rp];
var cat=AC[cn];

if(cat==="tr"){
// Track ALL transfers per company (for per-company control sum)
if(isV){if(inc>0)vTrIn+=inc;if(out>0)vTrOut+=out;}
if(isT){if(inc>0)tTrIn+=inc;if(out>0)tTrOut+=out;}
return;
}

if(inc>0){
if(cat==="pr"){if(isV)vPr+=inc;else tPr+=inc;}
else if(cat==="pjIn"&&pOk){if(isV){vPjIn+=inc;vPiP[gp]=(vPiP[gp]||0)+inc;}else{tPjIn+=inc;tPiP[gp]=(tPiP[gp]||0)+inc;}}
else if(cat==="refund"&&pOk){if(isV)vRefund+=inc;else tRefund+=inc;}
else if(cat==="skIn"){if(isV)vSkIn+=inc;else tSkIn+=inc;}
else{if(isV)vPoIn+=inc;else tPoIn+=inc;}
}

if(out>0){
if(cat==="zp"){if(isV)vZp+=out;else tZp+=out;}
else if(cat==="km"){if(isV)vKm+=out;else tKm+=out;}
else if(cat==="ins"){if(isV)vIns+=out;else tIns+=out;}
else if(cat==="bk"){if(isV)vBk+=out;else tBk+=out;}
else if(cat==="lz"){if(isV)vLz+=out;else tLz+=out;}
else if(cat==="ar"){if(isV)vAr+=out;else tAr+=out;}
else if(cat==="buh"){if(isV)vBuh+=out;else tBuh+=out;}
else if(cat==="ntax"){if(isV)vNtax+=out;else tNtax+=out;}
else if(cat==="po"){if(isV)vPo+=out;else tPo+=out;poDet.push({date:tx.date,cat:cn,out:out,co:isV?"В":"Т"});}
else if(cat==="svc"){
if(pOk){if(isV){vPjOut+=out;if(gp)vPoP[gp]=(vPoP[gp]||0)+out;}else{tPjOut+=out;if(gp)tPoP[gp]=(tPoP[gp]||0)+out;}}
else{if(isV)vPo+=out;else tPo+=out;poDet.push({date:tx.date,cat:cn,out:out,co:isV?"В":"Т"});}
}
else if(cat==="pct"){if(isV)vPct+=out;else tPct+=out;}
else if(cat==="bg"){
if(pOff){if(isV)vBg+=out;else tBg+=out;}
else{if(isV){vPjOut+=out;if(gp&&pOk)vPoP[gp]=(vPoP[gp]||0)+out;}else{tPjOut+=out;if(gp&&pOk)tPoP[gp]=(tPoP[gp]||0)+out;}}
}
else if(cat==="skOut"){if(isV)vSkOut+=out;else tSkOut+=out;}
else if(!pOff){if(isV){vPjOut+=out;if(gp&&pOk)vPoP[gp]=(vPoP[gp]||0)+out;}else{tPjOut+=out;if(gp&&pOk)tPoP[gp]=(tPoP[gp]||0)+out;}}
}
});

// Opening balances
var vSt=0,tSt=0;
txAll.forEach(function(tx){
if(!tx.date||tx.date>=rng.s0)return;
var aid=tx.org_account_id,inc=num(tx.income)||0,out=num(tx.outcome)||0;
if(VSIP[aid])vSt+=inc-out;if(TT[aid])tSt+=inc-out;
});

var vOff=vZp+vKm+vBk+vIns+vLz+vAr+vBuh+vNtax+vPo+vPct+vBg;
var tOff=tZp+tKm+tBk+tIns+tLz+tAr+tBuh+tNtax+tPo+tPct+tBg;
var vTe=vPjOut+vOff, tTe=tPjOut+tOff;

return{
vSt:vSt,tSt:tSt,vEnd:vEnd,tEnd:tEnd,
vPr:vPr,tPr:tPr,vPjIn:vPjIn,tPjIn:tPjIn,vRefund:vRefund,tRefund:tRefund,vPoIn:vPoIn,tPoIn:tPoIn,
vPjOut:vPjOut,tPjOut:tPjOut,
vZp:vZp,tZp:tZp,vKm:vKm,tKm:tKm,vBk:vBk,tBk:tBk,vIns:vIns,tIns:tIns,
vLz:vLz,tLz:tLz,vAr:vAr,tAr:tAr,vBuh:vBuh,tBuh:tBuh,vNtax:vNtax,tNtax:tNtax,
vPo:vPo,tPo:tPo,vPct:vPct,tPct:tPct,vBg:vBg,tBg:tBg,
vOff:vOff,tOff:tOff,vTe:vTe,tTe:tTe,
vTrIn:vTrIn,tTrIn:tTrIn,vTrOut:vTrOut,tTrOut:tTrOut,
vSkIn:vSkIn,tSkIn:tSkIn,vSkOut:vSkOut,tSkOut:tSkOut,
vPiP:vPiP,tPiP:tPiP,vPoP:vPoP,tPoP:tPoP,poDet:poDet,
cnt:txMonth.length,d0:rng.d0,d1:rng.d1,label:rng.label,ymd:rng.ymd
};
}

// ── Table helpers (4-column: label | ВСИП | ТТ | Итого) ──────
var BDR="border-top:1px solid #e5e7eb";
function cl(v,cls){return cls==="g"&&v>0?"color:#16a34a":cls==="r"&&v<0?"color:#dc2626":cls==="m"?"color:#9ca3af":"";}
function TR4(l,v,t,vc,tc,ind){
var tot=(v||0)+(t||0);
var ls="padding:3px 5px"+(ind?";padding-left:13px":"");
var vs="padding:3px 5px;text-align:right;white-space:nowrap"+(cl(v,vc)?";"+cl(v,vc):"");
var ts="padding:3px 5px;text-align:right;white-space:nowrap"+(cl(t,tc)?";"+cl(t,tc):"");
var os="padding:3px 5px;text-align:right;white-space:nowrap;color:#6b7280";
return"<tr><td style='"+ls+"'>"+l+"</td><td class='v' style='"+vs+"'>"+fmt(v)+"</td><td class='v' style='"+ts+"'>"+fmt(t)+"</td><td class='v' style='"+os+"'>"+fmt(tot)+"</td></tr>";
}
function SEP4(l,v,t,vc,tc){
var tot=(v||0)+(t||0);
var b=BDR+";padding:3px 5px;font-weight:600";
var vs=b+";text-align:right;white-space:nowrap"+(cl(v,vc)?";"+cl(v,vc):"");
var ts=b+";text-align:right;white-space:nowrap"+(cl(t,tc)?";"+cl(t,tc):"");
var totCls=(vc==="g"||tc==="g")?(tot>0?"g":""):(vc==="r"||tc==="r")?(tot<0?"r":""):"";
var os=b+";text-align:right;white-space:nowrap;color:#374151"+(cl(tot,totCls)?";"+cl(tot,totCls):"");
return"<tr><td style='"+b+"'>"+l+"</td><td class='v' style='"+vs+"'>"+fmt(v)+"</td><td class='v' style='"+ts+"'>"+fmt(t)+"</td><td class='v' style='"+os+"'>"+fmt(tot)+"</td></tr>";
}
function SEC4(l){return"<tr><td colspan='4' style='padding:6px 5px 2px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;"+BDR+"'>"+l+"</td></tr>";}
function HDR4(){
var h="padding:2px 5px;font-size:10px;font-weight:600;text-align:right";
return"<tr><td></td>"
+"<td class='v' style='"+h+";color:#374151'>ВСИП</td>"
+"<td class='v' style='"+h+";color:#374151'>ТТ</td>"
+"<td class='v' style='"+h+";color:#6b7280'>Итого</td></tr>";
}

function render(r,live){
var rows=[],vTot=0,tTot=0;
rows.push(HDR4());

// Balances
rows.push(TR4("Остаток "+r.d0,r.vSt,r.tSt,"",r.tSt<0?"r":"",""));
rows.push(SEP4("ИТОГО на "+r.d0,r.vSt,r.tSt,"",""));
rows.push(TR4("Остаток "+r.d1,r.vEnd,r.tEnd,r.vEnd<0?"r":"",r.tEnd<0?"r":"",""));
rows.push(SEP4("ИТОГО на "+r.d1,r.vEnd,r.tEnd,r.vEnd>=0?"g":"r",r.tEnd>=0?"g":"r"));

// Income
rows.push(SEC4("Поступления"));
var vHasPi=Object.keys(r.vPiP).length>0,tHasPi=Object.keys(r.tPiP).length>0;
if(vHasPi||tHasPi){
PO.forEach(function(p){
var v=r.vPiP[p]||0,t=r.tPiP[p]||0;
if(v||t){rows.push(TR4(PN[p],v,t,"g","g",true));vTot+=v;tTot+=t;}
});
}else if(r.vPjIn||r.tPjIn){
rows.push(TR4("Поступления по проектам",r.vPjIn,r.tPjIn,"g","g",true));
vTot+=r.vPjIn;tTot+=r.tPjIn;
}
if(r.vPr||r.tPr){rows.push(TR4("Процентные доходы",r.vPr,r.tPr,"g","g",true));vTot+=r.vPr;tTot+=r.tPr;}
if(r.vRefund||r.tRefund){rows.push(TR4("Возвраты",r.vRefund,r.tRefund,"g","g",true));vTot+=r.vRefund;tTot+=r.tRefund;}
if(r.vPoIn||r.tPoIn){rows.push(TR4("Прочие поступления",r.vPoIn,r.tPoIn,"g","g",true));vTot+=r.vPoIn;tTot+=r.tPoIn;}
rows.push(SEP4("Итого поступлений",vTot,tTot,"g","g"));

// Project expenses
rows.push(SEC4("Расходы по проектам"));
var vHasPo=Object.keys(r.vPoP).length>0,tHasPo=Object.keys(r.tPoP).length>0;
if(vHasPo||tHasPo){
PO.forEach(function(p){
var v=r.vPoP[p]||0,t=r.tPoP[p]||0;
if(v||t)rows.push(TR4(PN[p],v,t,"","",true));
});
}
rows.push(SEP4("Итого проекты",r.vPjOut,r.tPjOut,"",""));

// Office
rows.push(SEC4("Офисные расходы"));
if(r.vZp||r.tZp)rows.push(TR4("Зарплата",r.vZp,r.tZp,"","",true));
if(r.vKm||r.tKm)rows.push(TR4("Командировочные",r.vKm,r.tKm,"","",true));
if(r.vIns||r.tIns)rows.push(TR4("Страхование",r.vIns,r.tIns,"","",true));
if(r.vBk||r.tBk)rows.push(TR4("Банковские комиссии",r.vBk,r.tBk,"","",true));
if(r.vLz||r.tLz)rows.push(TR4("Лизинг",r.vLz,r.tLz,"","",true));
if(r.vAr||r.tAr)rows.push(TR4("Аренда",r.vAr,r.tAr,"","",true));
if(r.vBuh||r.tBuh)rows.push(TR4("Бухгалтерия",r.vBuh,r.tBuh,"","",true));
if(r.vNtax||r.tNtax)rows.push(TR4("Налоги и взносы",r.vNtax,r.tNtax,"","",true));
if(r.vPct||r.tPct)rows.push(TR4("Проценты к уплате",r.vPct,r.tPct,"","",true));
if(r.vBg||r.tBg)rows.push(TR4("Банковские гарантии",r.vBg,r.tBg,"","",true));
if(r.vPo||r.tPo)rows.push(TR4("Прочие офисные",r.vPo,r.tPo,"","",true));
rows.push(SEP4("Итого офисные",r.vOff,r.tOff,"",""));

// Transfers — показываем только НЕТТО на компанию.
// Валовые суммы раздуты из-за внутрикомпанийских переводов (оба конца попадают в одну компанию).
// Нетто корректно: внутри компании = 0, межкомпанийские и внешние учитываются.
var vTrN=r.vTrIn-r.vTrOut,tTrN=r.tTrIn-r.tTrOut;
rows.push(SEC4("Переводы между счетами"));
rows.push(SEP4("Нетто переводов",vTrN,tTrN,vTrN>0?"g":vTrN<0?"r":"",tTrN>0?"g":tTrN<0?"r":""));

// Loans
if(r.vSkIn||r.tSkIn||r.vSkOut||r.tSkOut){
rows.push(SEC4("Финансирование"));
if(r.vSkIn||r.tSkIn)rows.push(TR4("Получение займов",r.vSkIn,r.tSkIn,"g","g",true));
if(r.vSkOut||r.tSkOut)rows.push(TR4("Погашение займов",r.vSkOut,r.tSkOut,"","",true));
rows.push(SEP4("Нетто займы",r.vSkIn-r.vSkOut,r.tSkIn-r.tSkOut,
r.vSkIn-r.vSkOut>0?"g":r.vSkIn-r.vSkOut<0?"r":"",
r.tSkIn-r.tSkOut>0?"g":r.tSkIn-r.tSkOut<0?"r":""));
}

rows.push(SEP4("ВСЕГО РАСХОДОВ",r.vTe,r.tTe,"",""));

// Per-company control sums: Ост.нач + Поступления + ТрНетто + ЗаймыНетто − Расходы − Ост.кон = 0
var vCtrl=r.vSt+vTot+r.vSkIn+vTrN-r.vTe-r.vSkOut-r.vEnd;
var tCtrl=r.tSt+tTot+r.tSkIn+tTrN-r.tTe-r.tSkOut-r.tEnd;
var vOk=Math.abs(vCtrl)<1,tOk=Math.abs(tCtrl)<1;
rows.push(SEP4((vOk&&tOk)?"Контрольная сумма":"Контрольная сумма ⚠",
vCtrl,tCtrl,vOk?"g":"r",tOk?"g":"r"));

var tOtCtrl=vCtrl+tCtrl;
var st=live?'<span style="color:#16a34a">● live · '+r.cnt+' тр.</span>':'<span style="color:#9ca3af">данные на '+r.d1+'</span>';
return'<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb">'
+'<div><div style="font-size:13px;font-weight:600">ДДС — '+r.label+'</div>'
+'<div style="font-size:10px;color:#9ca3af;margin-top:1px">'+r.d0+' — '+r.d1+'</div></div>'
+'<div style="display:flex;align-items:center;gap:5px;flex-shrink:0">'
+'<span id="st" style="font-size:10px">'+st+'</span>'
+'<button id="btn" style="background:none;border:1px solid #d1d5db;color:#6b7280;font-size:10px;padding:1px 6px;border-radius:3px;cursor:pointer">↻</button>'
+'<button id="rst" style="background:none;border:1px solid #d1d5db;color:#9ca3af;font-size:10px;padding:1px 5px;border-radius:3px;cursor:pointer">⟳₀</button>'
+'</div></div>'
+'<table>'+rows.join('')+'</table>'
+'<div style="margin-top:5px;font-size:10px;color:#9ca3af">обновлено: '+new Date().toLocaleTimeString("ru-RU")+'</div>';
}

function renderPoDet(poDet){
if(!poDet||!poDet.length)return;
var d=document.createElement("details"),s=document.createElement("summary");
var tot=poDet.reduce(function(a,p){return a+p.out;},0);
s.textContent="Прочие расходы ("+poDet.length+" тр. · "+fmtI(tot)+" р.)";
d.appendChild(s);
var t=document.createElement("table");t.style.cssText="width:100%;border-collapse:collapse;margin-top:4px";
poDet.sort(function(a,b){return b.out-a.out;}).forEach(function(p){
var tr=document.createElement("tr");
tr.innerHTML="<td style='padding:2px 4px;font-size:10px;color:#666'>"+p.date+"</td>"
+"<td style='padding:2px 4px;font-size:10px;color:#888;text-align:center'>"+p.co+"</td>"
+"<td colspan='2' style='padding:2px 4px;font-size:10px;color:#666'>"+p.cat+"</td>"
+"<td style='padding:2px 4px;font-size:10px;text-align:right'>"+fmtI(p.out)+"</td>";
t.appendChild(tr);
});
d.appendChild(t);document.getElementById("root").appendChild(d);
}

function load(reset){
var el=document.getElementById("root"),rng=getRange();
if(reset)try{localStorage.removeItem("dds_"+ACCOUNT_ID+"_"+rng.ymd);}catch(e){}
var s=document.getElementById("st");if(s){s.textContent="загрузка…";s.style.color="#9ca3af";}
Promise.all([loadAll("transaction"),loadAll("categories")]).then(function(res){
var txAll=res[0],cats=res[1];
var rng=getRange();
var txM=txAll.filter(function(tx){return tx.date&&tx.date>=rng.s0&&tx.date<=rng.s1;});
console.log("[DDS] tx:",txAll.length,"period:",txM.length,"cats:",cats.length);
if(txM.length){
var r=calc(txM,txAll,cats,rng);
el.innerHTML=render(r,true);
renderPoDet(r.poDet);
}else{
el.innerHTML="<div style='padding:12px;font-size:11px;color:#444'>"
+"<b>Нет транзакций за "+rng.label+"</b><br><br>"
+"tx всего: <b>"+txAll.length+"</b>, за период: <b>"+txM.length+"</b><br>"
+"categories: <b>"+cats.length+"</b><br>"
+"domain: "+DOMAIN+"<br>"
+"API_BASE: "+API_BASE+"</div>";
}
var b=document.getElementById("btn");if(b)b.onclick=function(){load(false);};
var rb=document.getElementById("rst");if(rb)rb.onclick=function(){load(true);};
}).catch(function(e){
el.innerHTML="<div style='padding:12px;color:#dc2626;font-size:11px'>"
+"<b>Ошибка:</b><br>"+e+"<br><br>domain: "+DOMAIN+"<br>API_BASE: "+API_BASE+"</div>";
console.error("[DDS]",e);
});
}

(function(){
var now=new Date(),cY=now.getFullYear(),cQ=Math.ceil((now.getMonth()+1)/3);
var defY=cY,defQ=cQ;
var qFM=[0,3,6,9];
if(qFM.indexOf(now.getMonth())>=0&&now.getDate()<=7){defQ=cQ-1;if(defQ===0){defQ=4;defY=cY-1;}}
var qs=document.getElementById("qs");
for(var y=cY;y>=cY-1;y--){for(var q=4;q>=1;q--){
if(y===cY&&q>cQ)continue;
var o=document.createElement("option");o.value=y+":"+q;o.textContent="К"+q+" "+y;
if(y===defY&&q===defQ)o.selected=true;qs.appendChild(o);
}}
qs.addEventListener("change",function(){load(false);});
})();

load(false);
setInterval(function(){load(false);},5*60*1000);
console.log("[DDS] started | domain:",DOMAIN,"| base:",API_BASE);
</script>
</body>
</html>`;
}
