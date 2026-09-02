function readBody(req) {
return new Promise(function(resolve) {
var d = '';
req.on('data', function(c) { d += c.toString(); });
req.on('end', function() { resolve(d); });
req.on('error',function() { resolve(''); });
});
}

function parseForm(body) {
var r = {};
if (!body) return r;
body.split('&').forEach(function(pair) {
var i = pair.indexOf('=');
if (i < 0) return;
r[decodeURIComponent(pair.slice(0, i).replace(/\+/g,' '))] =
decodeURIComponent(pair.slice(i+1).replace(/\+/g,' '));
});
return r;
}

async function handler(req, res) {
res.setHeader('X-Frame-Options', 'ALLOWALL');
res.setHeader('Content-Security-Policy', "frame-ancestors *");
res.setHeader('Content-Type', 'text/html; charset=utf-8');

if (req.method === 'POST') {
var raw = await readBody(req);
var fields = parseForm(raw);
var domain = fields['domain'] || '';
var accountId = fields['account[id]'] || '';
var accessToken = fields['auth[access_token]'] || '';
var vercelHost = req.headers['host'] || '';
console.log('[DDS] POST | domain:', domain, '| account:', accountId, '| hasToken:', !!accessToken, '| host:', vercelHost);
return res.status(200).send(html(domain, accountId, accessToken, vercelHost));
}

return res.status(200).send('<html><body style="font-family:sans-serif;padding:20px"><h3>&#x2713; ДДС виджет работает</h3></body></html>');
}

handler.config = { api: { bodyParser: false } };
module.exports = handler;

function esc(s) {
return String(s||'').replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$/g,'\\$');
}

function html(domain, accountId, accessToken, vercelHost) {
var d=domain,a=accountId,t=accessToken,h=vercelHost;
return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ДДС</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;background:#f8f9fd;color:#111827;padding:8px}
table{width:100%;border-collapse:collapse}
td{padding:2px 3px}
details summary{font-size:10px;color:#9ca3af;cursor:pointer;padding:4px 0}
details table td{font-size:10px;color:#555;padding:2px 4px}
</style>
</head>
<body>
<div id="filters" style="display:flex;gap:6px;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e5e7eb">
<select id="qs" style="font-size:11px;border:1px solid #d1d5db;border-radius:3px;padding:2px 6px;color:#374151;background:#fff;cursor:pointer"></select>
</div>
<div id="root" style="color:#9ca3af">ДДС — загрузка…</div>
<script>
(function(){
var DOMAIN="${esc(d)}";
var ACCOUNT_ID="${esc(a)}";
var TOKEN="${esc(t)}";
var API_BASE="${esc(h)}"?"https://${esc(h)}":(location.origin||"");

var VSIP={2:1,4:1,5:1,6:1,7:1,8:1};
var TT={18:1,26:1};
var OFF={24:1};
var PN={1:"Кемерово",3:"Южно-Сахалинск",10:"Большое Болдино",25:"Южно-Сахалинск",13:"Барнаул",12:"Киров",23:"Сыктывкар",9:"Рузаевка",7:"Иволгинск",6:"Десногорск",102:"Голутвинский",100:"Центральный договор",101:"Прочие проекты"};
var PO=[1,3,10,13,12,23,9,7,6,102,100,101];
var PG={2:100,4:101,18:100,19:100,21:101,29:100,30:100,31:100,32:100,33:102,17:101,20:101,22:101,28:101};
var AC={
"Перевод между счетами (поступление)":"tr","Перевод между счетами (списание)":"tr",
"Получение кредита":"skIn","Выплата кредита":"skOut",
"Оказание услуг":"pjIn","Оказание услуг проекту":"pjIn","Возврат ДС. за заказы":"refund",
"Проценты к получению":"pr","НДС исходящий":"pr","Налог - НДС":"pr",
"Зарплата":"zp","Налоги с зарплаты":"zp","Командировки":"km","Страхование":"ins",
"Расходы на услуги банков":"bk","Банковские услуги":"bk","Расходы на лизинг":"lz",
"Аренда":"ar","Бухгалтерия":"buh","Налоги и взносы":"ntax","Налоги - НДС":"ntax",
"Прочее":"po","Интернет и связь":"po","Проценты к уплате":"pct","Оборудование":"po",
"Возвраты клиентам":"pjOut","Нераспределенные":"po","Нераспределенные (списание)":"po","Офис":"po",
"СМР (Без детализации)":"pjOut","СМР Вент+кондиц":"pjOut",
"Материалы (Вентиляция)":"pjOut","Материалы (Отопление)":"pjOut","Материалы (Потолки)":"pjOut",
"Материалы (Проемы)":"pjOut","Материалы (Стены)":"pjOut","Материалы (Транспорт, Логистика)":"pjOut",
"Материалы (Электрика)":"pjOut","Материалы черновые":"pjOut",
"Проектирование-Изыскание":"pjOut","Составление исполнительной документации":"svc",
"Услуги по сертификации":"svc","Тесты и испытания":"svc","Банковские гарантии":"bg"
};

function fmt(v){if(v===null||v===undefined||v===0)return"—";return new Intl.NumberFormat("ru-RU",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v);}
function fmtI(v){return new Intl.NumberFormat("ru-RU",{minimumFractionDigits:0,maximumFractionDigits:0}).format(v||0);}
function _ddsNum(s){if(!s&&s!==0)return 0;return parseFloat(String(s).replace(/[^0-9.-]/g,""))||0;}
function getRange(){
  var qs=document.getElementById("qs");
  var val=qs?qs.value:"";
  var now=new Date(),y=now.getFullYear(),q=Math.ceil((now.getMonth()+1)/3);
  if(val){var pts=val.split(":");y=parseInt(pts[0],10);q=parseInt(pts[1],10);}
  var s0=[y+"-01-01",y+"-04-01",y+"-07-01",y+"-10-01"][q-1];
  var s1=[y+"-03-31",y+"-06-30",y+"-09-30",y+"-12-31"][q-1];
  var todayStr=new Date().toISOString().slice(0,10);
  if(s1>todayStr)s1=todayStr;
  var d0=s0.slice(8)+"."+s0.slice(5,7)+"."+s0.slice(0,4);
  var d1=s1.slice(8)+"."+s1.slice(5,7)+"."+s1.slice(0,4);
  return{s0:s0,s1:s1,d0:d0,d1:d1,label:"К"+q+" "+y,ymd:s0.slice(0,7)};
}

var lk=function(ym){return"dds_"+ACCOUNT_ID+"_"+ym;};
function clrF(ym){try{localStorage.removeItem(lk(ym));}catch(e){}}

function loadAll(entity,extra){
  var all=[],page=1;
  function next(){
    var p=new URLSearchParams(extra||{});
    p.set('entity',entity);p.set('limit','100');p.set('page',String(page));
    return fetch(API_BASE+'/api/data?'+p.toString()).then(function(r){
      if(!r.ok)throw new Error('HTTP '+r.status);
      return r.json();
    }).then(function(d){
      if(d.error)throw new Error(JSON.stringify(d.error));
      var items=(d.response&&d.response.items)||[];
      var total=(d.response&&d.response.total)||0;
      all=all.concat(items);
      if(all.length>=total||items.length===0)return all;
      page++;return next();
    });
  }
  return next();
}

function calc(txMonth,txAll,cats,plsData,corrData,rng){
  var cMap={};
  cats.forEach(function(c){cMap[c.id]=c.name||"";});

  var vSt=0,tSt=0,vEnd=0,tEnd=0;
  txAll.forEach(function(tx){
    if(!tx.date)return;
    var aid=tx.org_account_id;
    var inc=_ddsNum(tx.income)||0,out=_ddsNum(tx.outcome)||0;
    if(tx.date<rng.s0){if(VSIP[aid])vSt+=inc-out;if(TT[aid])tSt+=inc-out;}
    if(tx.date<=rng.s1){if(VSIP[aid])vEnd+=inc-out;if(TT[aid])tEnd+=inc-out;}
  });

  var vPr=0,tPr=0,vPjIn=0,tPjIn=0,piP_v={},piP_t={};
  var vRefund=0,tRefund=0,vPoIn=0,tPoIn=0;
  var vPjOut=0,tPjOut=0,poP_v={},poP_t={};
  var vZp=0,tZp=0,vKm=0,tKm=0,vIns=0,tIns=0,vBk=0,tBk=0;
  var vLz=0,tLz=0,vAr=0,tAr=0,vBuh=0,tBuh=0,vNtax=0,tNtax=0;
  var vPo=0,tPo=0,vPct=0,tPct=0,vBg=0,tBg=0;
  var trIn_v=0,trOut_v=0,trIn_t=0,trOut_t=0;
  var vSkIn=0,tSkIn=0,vSkOut=0,tSkOut=0;
  var poDet=[];

  txMonth.forEach(function(tx){
    var aid=tx.org_account_id,cn=cMap[tx.category_id]||"";
    var pid=tx.project_id||0;
    var inc=_ddsNum(tx.income)||0,out=_ddsNum(tx.outcome)||0;
    var isV=!!VSIP[aid],isT=!!TT[aid];
    if(!isV&&!isT)return;
    var rp=pid,gp=(rp&&PG[rp])?PG[rp]:rp;
    var pOk=gp&&!!PN[gp],pOff=rp&&!!OFF[rp];
    var cat=AC[cn];

    if(cat==="tr"){
      if(rp===27||rp===24||rp===26){
        if(isV){trIn_v+=inc;trOut_v+=out;}
        if(isT){trIn_t+=inc;trOut_t+=out;}
      }
      return;
    }
    if(inc>0){
      if(cat==="pr"){if(isV)vPr+=inc;if(isT)tPr+=inc;}
      else if(cat==="pjIn"&&pOk){if(isV){vPjIn+=inc;piP_v[gp]=(piP_v[gp]||0)+inc;}if(isT){tPjIn+=inc;piP_t[gp]=(piP_t[gp]||0)+inc;}}
      else if(cat==="refund"){if(isV)vRefund+=inc;if(isT)tRefund+=inc;}
      else if(cat==="skIn"){if(isV)vSkIn+=inc;if(isT)tSkIn+=inc;}
      else{if(isV)vPoIn+=inc;if(isT)tPoIn+=inc;}
    }
    if(out>0){
      if(cat==="zp"){if(isV)vZp+=out;if(isT)tZp+=out;}
      else if(cat==="km"){if(isV)vKm+=out;if(isT)tKm+=out;}
      else if(cat==="ins"){if(isV)vIns+=out;if(isT)tIns+=out;}
      else if(cat==="bk"){if(isV)vBk+=out;if(isT)tBk+=out;}
      else if(cat==="lz"){if(isV)vLz+=out;if(isT)tLz+=out;}
      else if(cat==="ar"){if(isV)vAr+=out;if(isT)tAr+=out;}
      else if(cat==="buh"){if(isV)vBuh+=out;if(isT)tBuh+=out;}
      else if(cat==="ntax"){if(isV)vNtax+=out;if(isT)tNtax+=out;}
      else if(cat==="pct"){if(isV)vPct+=out;if(isT)tPct+=out;}
      else if(cat==="bg"){
        if(pOff){if(isV)vBg+=out;if(isT)tBg+=out;}
        else{if(isV){vPjOut+=out;if(gp&&pOk)poP_v[gp]=(poP_v[gp]||0)+out;}if(isT){tPjOut+=out;if(gp&&pOk)poP_t[gp]=(poP_t[gp]||0)+out;}}
      }
      else if(cat==="skOut"){if(isV)vSkOut+=out;if(isT)tSkOut+=out;}
      else if(cat==="svc"){
        if(pOk){if(isV){vPjOut+=out;if(gp)poP_v[gp]=(poP_v[gp]||0)+out;}if(isT){tPjOut+=out;if(gp)poP_t[gp]=(poP_t[gp]||0)+out;}}
        else{if(isV)vPo+=out;if(isT)tPo+=out;poDet.push({date:tx.date,cat:cn,out:out});}
      }
      else if(cat==="po"){if(isV)vPo+=out;if(isT)tPo+=out;poDet.push({date:tx.date,cat:cn,out:out});}
      else if(!pOff){if(isV){vPjOut+=out;if(gp&&pOk)poP_v[gp]=(poP_v[gp]||0)+out;}if(isT){tPjOut+=out;if(gp&&pOk)poP_t[gp]=(poP_t[gp]||0)+out;}}
    }
  });

  // ─── Индекс транзакций по id (для разнесения НДС по офисным строкам) ─────
  var txCatMap={};
  txMonth.forEach(function(tx){
    if(tx.id)txCatMap[tx.id]={cat:AC[cMap[tx.category_id]||""],isV:!!VSIP[tx.org_account_id],isT:!!TT[tx.org_account_id]};
  });

  // ─── НДС из transaction_pls ──────────────────────────────────────────────
  var vVatPiP={},tVatPiP={},vVatPoP={},tVatPoP={};
  var vVatNonProjIn=0,tVatNonProjIn=0;
  var vVatOffice=0,tVatOffice=0,vVatTransfer=0,tVatTransfer=0;
  var vVatTotalIn=0,tVatTotalIn=0,vVatTotalOut=0,tVatTotalOut=0;
  // НДС по офисным категориям — из !pOk 3144 с reference_id → родительская транзакция
  var vVatZp=0,tVatZp=0,vVatKm=0,tVatKm=0,vVatIns=0,tVatIns=0;
  var vVatBk=0,tVatBk=0,vVatLz=0,tVatLz=0,vVatAr=0,tVatAr=0;
  var vVatBuh=0,tVatBuh=0,vVatNtax=0,tVatNtax=0,vVatPct=0,tVatPct=0;
  var vVatPo=0,tVatPo=0,vVatBg=0,tVatBg=0;

  (plsData||[]).forEach(function(p){
    if(!p.date||p.date<rng.s0||p.date>rng.s1)return;
    var is3144=p.category_id===3144,is3147=p.category_id===3147;
    if(!is3144&&!is3147)return;
    var pid=p.project_id||0;
    var gp=(pid&&PG[pid])?PG[pid]:pid;
    var pOk=gp&&!!PN[gp];
    if(is3147){
      // НДС внутри поступлений → доходные строки (корректировка через outcome вычитается)
      var inc47=(_ddsNum(p.income)||0)-(_ddsNum(p.outcome)||0);if(!inc47)return;
      if(!pOk){if(p.org_id===1)vVatNonProjIn+=inc47;else if(p.org_id===2)tVatNonProjIn+=inc47;return;}
      if(p.org_id===1){vVatPiP[gp]=(vVatPiP[gp]||0)+inc47;vVatTotalIn+=inc47;}
      else if(p.org_id===2){tVatPiP[gp]=(tVatPiP[gp]||0)+inc47;tVatTotalIn+=inc47;}
    }
    if(is3144){
      // НДС внутри платежей → расходные строки
      var out44=(_ddsNum(p.outcome)||0)-(_ddsNum(p.income)||0);if(!out44)return;
      if(!pOk){
        // Через reference_id определяем категорию родительской транзакции
        var ri=p.reference_id?txCatMap[p.reference_id]:null;
        var oc=ri?ri.cat:null;
        var oV=ri?ri.isV:(p.org_id===1),oT=ri?ri.isT:(p.org_id===2);
        var matched=false;
        if(oc==="zp" ){if(oV)vVatZp+=out44; if(oT)tVatZp+=out44; matched=true;}
        else if(oc==="km" ){if(oV)vVatKm+=out44; if(oT)tVatKm+=out44; matched=true;}
        else if(oc==="ins"){if(oV)vVatIns+=out44;if(oT)tVatIns+=out44;matched=true;}
        else if(oc==="bk" ){if(oV)vVatBk+=out44; if(oT)tVatBk+=out44; matched=true;}
        else if(oc==="lz" ){if(oV)vVatLz+=out44; if(oT)tVatLz+=out44; matched=true;}
        else if(oc==="ar" ){if(oV)vVatAr+=out44; if(oT)tVatAr+=out44; matched=true;}
        else if(oc==="buh"){if(oV)vVatBuh+=out44;if(oT)tVatBuh+=out44;matched=true;}
        else if(oc==="ntax"){if(oV)vVatNtax+=out44;if(oT)tVatNtax+=out44;matched=true;}
        else if(oc==="pct"){if(oV)vVatPct+=out44;if(oT)tVatPct+=out44;matched=true;}
        else if(oc==="po"||oc==="svc"){if(oV)vVatPo+=out44;if(oT)tVatPo+=out44;matched=true;}
        else if(oc==="bg"){if(oV)vVatBg+=out44; if(oT)tVatBg+=out44; matched=true;}
        if(!matched){if(p.org_id===1)vVatTransfer+=out44;else if(p.org_id===2)tVatTransfer+=out44;}
        return;
      }
      if(p.org_id===1){
        vVatPoP[gp]=(vVatPoP[gp]||0)+out44;vVatTotalOut+=out44;
        if(gp===100||gp===101)vVatOffice+=out44; // офисные проекты — подмножество vVatTotalOut
      }
      else if(p.org_id===2){
        tVatPoP[gp]=(tVatPoP[gp]||0)+out44;tVatTotalOut+=out44;
        if(gp===100||gp===101)tVatOffice+=out44;
      }
    }
  });

  // ─── Корректировки НДС из plan_money org_account_id=149 ─────────────────
  var vCorrPrev=0,tCorrPrev=0,vCorrCurr=0,tCorrCurr=0;
  var _currQ=Math.ceil((new Date(rng.s0).getMonth()+1)/3);
  (corrData||[]).forEach(function(p){
    var ppd=p.plan_paid_date||"";
    if(!ppd||ppd<rng.s0||ppd>rng.s1)return;
    var nm=p.name||"";
    var isV=nm.indexOf("ВСИП")>=0,isT=nm.indexOf("ТТ")>=0||nm.indexOf("Тт")>=0;
    if(!isV&&!isT)return;
    var amt=parseFloat(p.total)||0;if(!amt)return;
    var cid=parseInt(p.category_id);
    var eff=cid===3144?amt:(cid===3147?-amt:0);if(!eff)return;
    var mq=nm.match(/(\d)\s*кварт/i),isPrev=mq&&parseInt(mq[1])<_currQ;
    if(isV){if(isPrev)vCorrPrev+=eff;else vCorrCurr+=eff;}
    if(isT){if(isPrev)tCorrPrev+=eff;else tCorrCurr+=eff;}
  });

  var pjIn=vPjIn+tPjIn,pr=vPr+tPr,refund=vRefund+tRefund,poIn=vPoIn+tPoIn;
  var tot=pjIn+pr+refund+poIn;
  var pjOut=vPjOut+tPjOut;
  var zp=vZp+tZp,km=vKm+tKm,bk=vBk+tBk,ins=vIns+tIns;
  var lz=vLz+tLz,ar=vAr+tAr,buh=vBuh+tBuh,ntax=vNtax+tNtax;
  var po=vPo+tPo,pct=vPct+tPct,bg=vBg+tBg;
  var te=pjOut+zp+km+bk+ins+lz+ar+buh+ntax+po+pct+bg;
  var skIn=vSkIn+tSkIn,skOut=vSkOut+tSkOut;
  var trNetto=(trIn_v+trIn_t)-(trOut_v+trOut_t);
  var tS=vSt+tSt,tE=vEnd+tEnd;
  var ctrl=tS+tot+skIn-(te+skOut-trNetto)-tE;
  var cOk=Math.abs(ctrl)<1;

  return{vSt:vSt,tSt:tSt,vEnd:vEnd,tEnd:tEnd,tS:tS,tE:tE,
    vPr:vPr,tPr:tPr,pr:pr,vPjIn:vPjIn,tPjIn:tPjIn,piP_v:piP_v,piP_t:piP_t,pjIn:pjIn,
    vRefund:vRefund,tRefund:tRefund,refund:refund,vPoIn:vPoIn,tPoIn:tPoIn,poIn:poIn,tot:tot,
    vPjOut:vPjOut,tPjOut:tPjOut,pjOut:pjOut,poP_v:poP_v,poP_t:poP_t,
    vZp:vZp,tZp:tZp,zp:zp,vKm:vKm,tKm:tKm,km:km,vIns:vIns,tIns:tIns,ins:ins,
    vBk:vBk,tBk:tBk,bk:bk,vLz:vLz,tLz:tLz,lz:lz,vAr:vAr,tAr:tAr,ar:ar,
    vBuh:vBuh,tBuh:tBuh,buh:buh,vNtax:vNtax,tNtax:tNtax,ntax:ntax,
    vPo:vPo,tPo:tPo,po:po,vPct:vPct,tPct:tPct,pct:pct,vBg:vBg,tBg:tBg,bg:bg,te:te,
    trIn_v:trIn_v,trOut_v:trOut_v,trIn_t:trIn_t,trOut_t:trOut_t,trNetto:trNetto,
    vSkIn:vSkIn,tSkIn:tSkIn,skIn:skIn,vSkOut:vSkOut,tSkOut:tSkOut,skOut:skOut,
    vVatPiP:vVatPiP,tVatPiP:tVatPiP,vVatPoP:vVatPoP,tVatPoP:tVatPoP,
    vVatNonProjIn:vVatNonProjIn,tVatNonProjIn:tVatNonProjIn,
    vVatOffice:vVatOffice,tVatOffice:tVatOffice,vVatTransfer:vVatTransfer,tVatTransfer:tVatTransfer,
    vVatZp:vVatZp,tVatZp:tVatZp,vVatKm:vVatKm,tVatKm:tVatKm,vVatIns:vVatIns,tVatIns:tVatIns,
    vVatBk:vVatBk,tVatBk:tVatBk,vVatLz:vVatLz,tVatLz:tVatLz,vVatAr:vVatAr,tVatAr:tVatAr,
    vVatBuh:vVatBuh,tVatBuh:tVatBuh,vVatNtax:vVatNtax,tVatNtax:tVatNtax,vVatPct:vVatPct,tVatPct:tVatPct,
    vVatPo:vVatPo,tVatPo:tVatPo,vVatBg:vVatBg,tVatBg:tVatBg,
    vVatOffRowTotal:vVatZp+vVatKm+vVatIns+vVatBk+vVatLz+vVatAr+vVatBuh+vVatNtax+vVatPct+vVatPo+vVatBg,
    tVatOffRowTotal:tVatZp+tVatKm+tVatIns+tVatBk+tVatLz+tVatAr+tVatBuh+tVatNtax+tVatPct+tVatPo+tVatBg,
    vVatTotalIn:vVatTotalIn,tVatTotalIn:tVatTotalIn,vVatTotalOut:vVatTotalOut,tVatTotalOut:tVatTotalOut,
    vCorrPrev:vCorrPrev,tCorrPrev:tCorrPrev,vCorrCurr:vCorrCurr,tCorrCurr:tCorrCurr,
    ctrl:ctrl,cOk:cOk,poDet:poDet,cnt:txMonth.length,d0:rng.d0,d1:rng.d1,label:rng.label,ymd:rng.ymd};
}

function HDR(){
  var sb="padding:2px 4px;font-size:10px;font-weight:700;color:#374151;border-bottom:2px solid #9ca3af;text-align:right;white-space:nowrap";
  var sl="padding:2px 4px;font-size:10px;font-weight:700;color:#374151;border-bottom:2px solid #9ca3af";
  var sn=sb+";color:#9ca3af";
  return"<tr><td style='"+sl+"'></td><td style='"+sb+"'>Итого</td><td style='"+sb+"'>ВСИП</td><td style='"+sn+"'>НДС</td><td style='"+sb+"'>ТТ</td><td style='"+sn+"'>НДС</td></tr>";
}
function TR6(l,tot,v,nv,t,nt,cls,ind){
  var cn="";if(cls==="g"&&(tot||0)>0)cn="color:#16a34a";if(cls==="r"&&(tot||0)<0)cn="color:#dc2626";if(cls==="m")cn="color:#6b7280";
  var sl="padding:2px 4px;color:#1f2937;font-size:11px"+(ind?";padding-left:12px":"");
  var sr="padding:2px 4px;text-align:right;white-space:nowrap;font-size:11px;color:#1f2937";
  var sc=sr+(cn?";"+cn:"");
  var sn="padding:2px 4px;text-align:right;white-space:nowrap;font-size:10px;color:#6b7280";
  return"<tr><td style='"+sl+"'>"+l+"</td><td style='"+sc+"'>"+fmt(tot)+"</td><td style='"+sr+"'>"+fmt(v)+"</td><td style='"+sn+"'>"+fmt(nv)+"</td><td style='"+sr+"'>"+fmt(t)+"</td><td style='"+sn+"'>"+fmt(nt)+"</td></tr>";
}
function SEP6(l,tot,v,nv,t,nt,cls){
  var cn="";if(cls==="g"&&(tot||0)>0)cn="color:#16a34a";if(cls==="r"&&(tot||0)<0)cn="color:#dc2626";
  var s="padding:2px 4px;font-weight:700;font-size:11px;color:#111827;border-top:1px solid #d1d5db";
  var sr=s+";text-align:right;white-space:nowrap";var sc=sr+(cn?";"+cn:"");var sn=sr+";color:#6b7280;font-weight:400;font-size:10px";
  return"<tr><td style='"+s+"'>"+l+"</td><td style='"+sc+"'>"+fmt(tot)+"</td><td style='"+sr+"'>"+fmt(v)+"</td><td style='"+sn+"'>"+fmt(nv)+"</td><td style='"+sr+"'>"+fmt(t)+"</td><td style='"+sn+"'>"+fmt(nt)+"</td></tr>";
}
function SEC(l){return"<tr><td colspan='6' style='padding:5px 4px 1px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;border-top:1px solid #e5e7eb'>"+l+"</td></tr>";}

// ─── Свод НДС — вспомогательные функции ──────────────────────────────────
function VSPH(){
  var s="padding:2px 4px;font-size:10px;font-weight:700;color:#374151;border-bottom:2px solid #9ca3af;text-align:right;white-space:nowrap";
  var sl="padding:2px 4px;font-size:10px;font-weight:700;color:#374151;border-bottom:2px solid #9ca3af;white-space:nowrap";
  return"<tr><td style='"+sl+"'></td><td style='"+s+"'>ВСИП</td><td style='"+s+"'>ТТ</td><td style='"+s+"'>Итого</td></tr>";
}
function VSPR(l,v,t,bold,cls){
  var tot=(v||0)+(t||0);
  var brd=bold?";border-top:1px solid #d1d5db":"";
  var fw=bold?";font-weight:700":"";
  var sl="padding:2px 4px;font-size:11px;color:#1f2937;white-space:nowrap"+fw+brd;
  var sr="padding:2px 4px;text-align:right;font-size:11px;white-space:nowrap;color:#1f2937"+fw+brd;
  var cn=cls==="r"&&tot>0?";color:#dc2626":cls==="g"&&tot<0?";color:#16a34a":"";
  return"<tr><td style='"+sl+"'>"+l+"</td><td style='"+sr+"'>"+fmt(v||0)+"</td><td style='"+sr+"'>"+fmt(t||0)+"</td><td style='"+sr+cn+"'>"+fmt(tot)+"</td></tr>";
}
function VSPB(){return"<tr><td colspan='4' style='height:5px'></td></tr>";}
function VSPRBAL(l,v,t,bold,fixedCls){
  var tot=(v||0)+(t||0);
  var fw=bold?";font-weight:700;border-top:1px solid #d1d5db":"";
  var sl="padding:2px 4px;font-size:11px;color:#1f2937;white-space:nowrap"+fw;
  function cv(x){
    if(fixedCls==="r")return";color:#dc2626";
    if(fixedCls==="g")return";color:#16a34a";
    return x<0?";color:#16a34a":x>0?";color:#dc2626":"";
  }
  var sr="padding:2px 4px;text-align:right;font-size:11px;white-space:nowrap"+fw;
  return"<tr><td style='"+sl+"'>"+l+"</td>"
    +"<td style='"+sr+cv(v)+"'>"+fmt(v)+"</td>"
    +"<td style='"+sr+cv(t)+"'>"+fmt(t)+"</td>"
    +"<td style='"+sr+cv(tot)+"'>"+fmt(tot)+"</td></tr>";
}
function VSPRS(l,v,t){
  var sl="padding:1px 4px 1px 12px;font-size:10px;color:#6b7280;white-space:nowrap";
  var sr="padding:1px 4px;text-align:right;font-size:10px;white-space:nowrap;color:#6b7280";
  var tot=(v||0)+(t||0);
  return"<tr><td style='"+sl+"'>"+l+"</td>"
    +"<td style='"+sr+"'>"+fmt(v||0)+"</td>"
    +"<td style='"+sr+"'>"+fmt(t||0)+"</td>"
    +"<td style='"+sr+"'>"+fmt(tot)+"</td></tr>";
}

function render(r,live){
  var rows=[];rows.push(HDR());
  rows.push(TR6("Остаток "+r.d0+" · ВСИП",r.vSt,r.vSt,null,null,null,"",""));
  rows.push(TR6("Остаток "+r.d0+" · ТТ",r.tSt,null,null,r.tSt,null,r.tSt<0?"r":"",""));
  rows.push(SEP6("ИТОГО на "+r.d0,r.tS,r.vSt,null,r.tSt,null,""));
  rows.push(TR6("Остаток "+r.d1+" · ВСИП",r.vEnd,r.vEnd,null,null,null,"",""));
  rows.push(TR6("Остаток "+r.d1+" · ТТ",r.tEnd,null,null,r.tEnd,null,r.tEnd<0?"r":"",""));
  rows.push(SEP6("ИТОГО на "+r.d1,r.tE,r.vEnd,null,r.tEnd,null,r.tE>=0?"g":"r"));

  rows.push(SEC("Поступления"));
  var hasPi=Object.keys(r.piP_v).length>0||Object.keys(r.piP_t).length>0;
  if(hasPi){
    PO.forEach(function(p){
      var pv=r.piP_v[p]||0,pt=r.piP_t[p]||0;
      if(pv||pt)rows.push(TR6(PN[p],pv+pt,pv,r.vVatPiP[p]||0,pt,r.tVatPiP[p]||0,"g",1));
    });
  }else if(r.pjIn){
    rows.push(TR6("Поступления по проектам",r.pjIn,r.vPjIn,null,r.tPjIn,null,"g",1));
  }
  if(r.pr)rows.push(TR6("Процентные доходы",r.pr,r.vPr,null,r.tPr,null,"g",1));
  if(r.refund)rows.push(TR6("Возвраты",r.refund,r.vRefund,null,r.tRefund,null,"g",1));
  if(r.poIn)rows.push(TR6("Прочие поступления",r.poIn,r.vPoIn,null,r.tPoIn,null,"g",1));
  rows.push(SEP6("Итого поступлений",r.tot,r.vPjIn+r.vPr+r.vRefund+r.vPoIn,r.vVatTotalIn+r.vVatNonProjIn,r.tPjIn+r.tPr+r.tRefund+r.tPoIn,r.tVatTotalIn+r.tVatNonProjIn,"g"));

  rows.push(SEC("Расходы по проектам"));
  var hasPo=Object.keys(r.poP_v).length>0||Object.keys(r.poP_t).length>0;
  if(hasPo){
    PO.forEach(function(p){
      var pv=r.poP_v[p]||0,pt=r.poP_t[p]||0;
      if(pv||pt)rows.push(TR6(PN[p],pv+pt,pv,r.vVatPoP[p]||0,pt,r.tVatPoP[p]||0,"",1));
    });
  }
  rows.push(SEP6("Итого проекты",r.pjOut,r.vPjOut,r.vVatTotalOut,r.tPjOut,r.tVatTotalOut,""));

  rows.push(SEC("Офисные расходы"));
  if(r.zp)rows.push(TR6("Зарплата",r.zp,r.vZp,r.vVatZp||null,r.tZp,r.tVatZp||null,"",1));
  if(r.km)rows.push(TR6("Командировочные",r.km,r.vKm,r.vVatKm||null,r.tKm,r.tVatKm||null,"",1));
  if(r.ins)rows.push(TR6("Страхование",r.ins,r.vIns,r.vVatIns||null,r.tIns,r.tVatIns||null,"",1));
  if(r.bk)rows.push(TR6("Банковские комиссии",r.bk,r.vBk,r.vVatBk||null,r.tBk,r.tVatBk||null,"",1));
  if(r.lz)rows.push(TR6("Лизинг",r.lz,r.vLz,r.vVatLz||null,r.tLz,r.tVatLz||null,"",1));
  if(r.ar)rows.push(TR6("Аренда",r.ar,r.vAr,r.vVatAr||null,r.tAr,r.tVatAr||null,"",1));
  if(r.buh)rows.push(TR6("Бухгалтерия",r.buh,r.vBuh,r.vVatBuh||null,r.tBuh,r.tVatBuh||null,"",1));
  if(r.ntax)rows.push(TR6("Налоги и взносы",r.ntax,r.vNtax,r.vVatNtax||null,r.tNtax,r.tVatNtax||null,"",1));
  if(r.pct)rows.push(TR6("Проценты к уплате",r.pct,r.vPct,r.vVatPct||null,r.tPct,r.tVatPct||null,"",1));
  if(r.bg)rows.push(TR6("Банковские гарантии",r.bg,r.vBg,r.vVatBg||null,r.tBg,r.tVatBg||null,"",1));
  if(r.po)rows.push(TR6("Прочие офисные",r.po,r.vPo,r.vVatPo||null,r.tPo,r.tVatPo||null,"",1));
  var offV=r.vZp+r.vKm+r.vBk+r.vIns+r.vLz+r.vAr+r.vBuh+r.vNtax+r.vPo+r.vPct+r.vBg;
  var offT=r.tZp+r.tKm+r.tBk+r.tIns+r.tLz+r.tAr+r.tBuh+r.tNtax+r.tPo+r.tPct+r.tBg;
  rows.push(SEP6("Итого офисные",r.zp+r.km+r.bk+r.ins+r.lz+r.ar+r.buh+r.ntax+r.po+r.pct+r.bg,offV,r.vVatOffRowTotal||null,offT,r.tVatOffRowTotal||null,""));

  rows.push(SEC("Переводы между счетами"));
  if(r.trIn_v||r.trIn_t){
    rows.push(TR6("Нетто переводы полученные",r.trIn_v+r.trIn_t,r.trIn_v,null,r.trIn_t,null,"g",""));
  }
  if(r.trOut_v||r.trOut_t){
    rows.push(TR6("Нетто переводы списание",r.trOut_v+r.trOut_t,r.trOut_v,null,r.trOut_t,null,"",""));
  }
  rows.push(SEP6("Нетто переводы",r.trNetto,(r.trIn_v-r.trOut_v),null,(r.trIn_t-r.trOut_t),null,r.trNetto>0?"g":r.trNetto<0?"r":""));
  var vVatNP=r.vVatNonProjIn+r.vVatOffice+r.vVatTransfer,tVatNP=r.tVatNonProjIn+r.tVatOffice+r.tVatTransfer;
  if(vVatNP||tVatNP)rows.push(TR6("НДС (трансферы/прочее)",vVatNP+tVatNP,vVatNP,null,tVatNP,null,"m",1));

  if(r.skIn||r.skOut){
    rows.push(SEC("Финансирование (займы)"));
    if(r.skIn)rows.push(TR6("Получение займов",r.skIn,r.vSkIn,null,r.tSkIn,null,"g",1));
    if(r.skOut)rows.push(TR6("Погашение займов",r.skOut,r.vSkOut,null,r.tSkOut,null,"",1));
    rows.push(SEP6("Нетто займы",r.skIn-r.skOut,r.vSkIn-r.vSkOut,null,r.tSkIn-r.tSkOut,null,r.skIn-r.skOut>0?"g":r.skIn-r.skOut<0?"r":""));
  }

  rows.push(SEP6("ВСЕГО РАСХОДОВ",r.te+r.skOut-r.trNetto,null,r.vVatTotalOut+r.vVatTransfer,null,r.tVatTotalOut+r.tVatTransfer,""));
  rows.push(SEP6(r.cOk?"Контрольная сумма":"Контрольная сумма ⚠",r.ctrl,null,null,null,null,r.cOk?"g":"r"));

  // ─── Свод НДС (справа) ──────────────────────────────────────────────────
  // vVatTotalIn  = 3147 (income) → доходные строки → НДС с клиентов → к уплате в бюджет
  // vVatTotalOut = 3144 (outcome) → расходные строки → НДС подрядчикам → к возмещению
  // БАЛАНС = к уплате − к возмещению (>0 красный = платим; <0 зелёный = возмещение)
  var vatPayV=r.vVatTotalIn+r.vVatNonProjIn,vatPayT=r.tVatTotalIn+r.tVatNonProjIn;
  // vVatOffice — подмножество vVatTotalOut (проекты 100/101); vVatOffRowTotal — из !pOk office
  var vatRecV=r.vVatTotalOut+r.vVatOffRowTotal+r.vVatTransfer,vatRecT=r.tVatTotalOut+r.tVatOffRowTotal+r.tVatTransfer;
  var vatBalV=vatPayV-vatRecV,vatBalT=vatPayT-vatRecT;
  var vst=[];
  vst.push(VSPH());
  vst.push(VSPR("НДС проекты",r.vVatTotalIn,r.tVatTotalIn,false,""));
  vst.push(VSPR("НДС прочие поступления",r.vVatNonProjIn,r.tVatNonProjIn,false,""));
  vst.push(VSPRBAL("К уплате",vatPayV,vatPayT,true,"r"));
  vst.push(VSPR("НДС проекты",r.vVatTotalOut-r.vVatOffice,r.tVatTotalOut-r.tVatOffice,false,""));
  vst.push(VSPR("НДС офисные",r.vVatOffice+r.vVatOffRowTotal,r.tVatOffice+r.tVatOffRowTotal,false,""));
  vst.push(VSPR("НДС трансф.",r.vVatTransfer,r.tVatTransfer,false,""));
  vst.push(VSPRBAL("К возмещению",vatRecV,vatRecT,true,"g"));
  vst.push(VSPRBAL("Баланс",vatBalV,vatBalT,true,null));
  vst.push(VSPRS("К уплате",vatBalV>0?vatBalV:0,vatBalT>0?vatBalT:0));
  vst.push(VSPRS("К возмещению",vatBalV<0?-vatBalV:0,vatBalT<0?-vatBalT:0));
  vst.push(VSPR("Корр. прош. кв.",r.vCorrPrev||null,r.tCorrPrev||null,false,""));
  vst.push(VSPR("Корр. тек. кв.",r.vCorrCurr||null,r.tCorrCurr||null,false,""));
  var vatItogV=vatBalV+r.vCorrPrev+r.vCorrCurr,vatItogT=vatBalT+r.tCorrPrev+r.tCorrCurr;
  vst.push(VSPRBAL("Итоговый Баланс",vatItogV,vatItogT,true,null));
  vst.push(VSPRS("К уплате",vatItogV>0?vatItogV:0,vatItogT>0?vatItogT:0));
  vst.push(VSPRS("К возмещению",vatItogV<0?-vatItogV:0,vatItogT<0?-vatItogT:0));

  var st=live?'<span style="color:#16a34a">● live · '+r.cnt+' тр.</span>':'<span style="color:#9ca3af">данные на '+r.d1+'</span>';
  return'<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">'
    +'<div><div style="font-size:13px;font-weight:600">ДДС — '+r.label+'</div>'
    +'<div style="font-size:10px;color:#9ca3af;margin-top:1px">'+r.d0+' — '+r.d1+'</div></div>'
    +'<div style="display:flex;align-items:center;gap:5px;flex-shrink:0">'
    +'<span id="st" style="font-size:10px">'+st+'</span>'
    +'<button id="btn" style="background:none;border:1px solid #d1d5db;color:#6b7280;font-size:10px;padding:1px 6px;border-radius:3px;cursor:pointer">↻</button>'
    +'<button id="rst" style="background:none;border:1px solid #d1d5db;color:#9ca3af;font-size:10px;padding:1px 5px;border-radius:3px;cursor:pointer">⟳₀</button>'
    +'</div></div>'
    +'<div style="display:flex;gap:12px;align-items:flex-start">'
    +'<div style="width:60%;flex-shrink:0"><table>'+rows.join('')+'</table></div>'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-size:10px;font-weight:700;color:#374151;border-bottom:2px solid #9ca3af;padding:2px 4px 3px;white-space:nowrap">Свод НДС</div>'
    +'<table style="border-collapse:collapse;width:100%">'+vst.join('')+'</table>'
    +'</div></div>'
    +'<div style="margin-top:5px;font-size:10px;color:#9ca3af">обновлено: '+new Date().toLocaleTimeString("ru-RU")+'</div>';
}

function renderPoDet(poDet){
  if(!poDet||!poDet.length)return;
  var d=document.createElement("details"),s=document.createElement("summary");
  var tot=poDet.reduce(function(a,p){return a+p.out;},0);
  s.textContent="Прочие расходы ("+poDet.length+" тр. на "+fmtI(tot)+" р.)";
  d.appendChild(s);
  var t=document.createElement("table");t.style.cssText="width:100%;border-collapse:collapse;margin-top:4px";
  poDet.sort(function(a,b){return b.out-a.out;}).forEach(function(p){
    var tr=document.createElement("tr");
    tr.innerHTML="<td style='padding:2px 4px;font-size:10px;color:#666'>"+p.date+"</td><td style='padding:2px 4px;font-size:10px;color:#666'>"+p.cat+"</td><td style='padding:2px 4px;font-size:10px;text-align:right'>"+fmtI(p.out)+"</td>";
    t.appendChild(tr);
  });
  d.appendChild(t);document.getElementById("root").appendChild(d);
}

function load(reset){
  var el=document.getElementById("root"),rng=getRange();
  if(reset)clrF(rng.ymd);
  var s=document.getElementById("st");
  if(s){s.textContent="загрузка…";s.style.color="#9ca3af";}
  Promise.all([
    loadAll("transaction"),
    loadAll("categories"),
    loadAll("transaction_pls",{"filter[category_id]":"3144,3147"}).catch(function(){return[];}),
    loadAll("plan_money",{"filter[org_account_id]":"149"}).catch(function(){return[];})
  ]).then(function(res){
    var txAll=res[0],cats=res[1],pls=res[2],corr=res[3];
    var rng=getRange();
    var txM=txAll.filter(function(tx){return tx.date&&tx.date>=rng.s0&&tx.date<=rng.s1;});
    if(txM.length){
      var r=calc(txM,txAll,cats,pls,corr,rng);
      el.innerHTML=render(r,true);
      renderPoDet(r.poDet);
    }else{
      el.innerHTML="<div style='padding:12px;font-size:11px;color:#666'>Нет данных за "+rng.label+" ("+rng.s0+" — "+rng.s1+")</div>";
    }
    var b=document.getElementById("btn");if(b)b.onclick=function(){load(false);};
    var rb=document.getElementById("rst");if(rb)rb.onclick=function(){load(true);};
  }).catch(function(e){
    el.innerHTML="<div style='padding:12px;color:#dc2626'>Ошибка: "+e+"</div>";
    console.error("[DDS]",e);
  });
}

(function(){
  var now=new Date(),cY=now.getFullYear(),cQ=Math.ceil((now.getMonth()+1)/3);
  var defY=cY,defQ=cQ;
  var qFirstMonths=[0,3,6,9];
  if(qFirstMonths.indexOf(now.getMonth())>=0&&now.getDate()<=7){defQ=cQ-1;if(defQ===0){defQ=4;defY=cY-1;}}
  var qs=document.getElementById("qs");
  for(var y=cY;y>=cY-1;y--){
    for(var q=4;q>=1;q--){
      if(y===cY&&q>cQ)continue;
      var o=document.createElement("option");
      o.value=y+":"+q;o.textContent="К"+q+" "+y;
      if(y===defY&&q===defQ)o.selected=true;
      qs.appendChild(o);
    }
  }
  qs.addEventListener("change",function(){load(false);});
})();

load(false);
setInterval(function(){load(false);},5*60*1000);
})();
</script>
</body>
</html>`;
}
