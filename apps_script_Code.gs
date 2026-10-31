/****************************************************************
 * CRESI AgroecologIA — collecteur RWANDA / One Acre Fund (Google Sheet)
 * 2 systèmes comparés en aveugle par question (slots A / B), 3 questions par évaluateur.
 *
 * GARDE-FOUS (leçon Oléiculture : réponses d'une évaluatrice perdues) :
 *  - le site POSTe l'état COMPLET de l'évaluateur après chaque modification (autosave),
 *    à chaque « Save this question » et au « Submit » final → onglet `etat` (1 ligne / évaluateur,
 *    écrasée à chaque envoi) + onglet `journal` (1 ligne / envoi, jamais écrasé).
 *  - GET ?action=state&ev=07 renvoie le dernier état → le site le restaure si le navigateur
 *    a été vidé ou si l'évaluateur change d'appareil.
 *  - `suivi` : tableau de bord animateur (profil, Q1/Q2/Q3 complete/partial, dernier contact, submit).
 *  - rebuild() : reconstruit `reponses` / `nuggets` / `ajouts` (format plat, comme les autres
 *    ateliers) à partir de `etat` — tous les évaluateurs, y compris ceux qui n'ont jamais cliqué Submit.
 *    Lancée automatiquement à chaque POST pour l'évaluateur concerné.
 *
 * Installation : Google Sheet → Extensions → Apps Script → coller ce code → Déployer →
 * Nouveau déploiement → Application web : exécuter en tant que MOI, accès TOUT LE MONDE.
 * Copier l'URL /exec dans config.js (ENDPOINT).
 ****************************************************************/
var SHEET_ID = "1qWj4uZ7u8mK6gmo4Fci9qL8FcE0fpCBR6c-oSK755uQ";   // AgroecologIA_Rwanda_1AF_evaluations (créé le 31/10/2026)
var CRIT  = ["Relevance","Clarity","Actionability","Trust","Length"];
var SLOTS = ["A","B"];
var PROF  = ["p_code","p_sexe","p_date","p_lieu","p_struct","p_spe","p_exp","p_dip","p_fam","p_agent","p_agent_autre","p_conf","p_conf_raison"];  // mêmes clés que les ateliers précédents

function ss_(){ return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

function doPost(e){
  var lock = LockService.getScriptLock();
  try{
    lock.waitLock(20000);
    var data = JSON.parse(e.postData.contents);
    var ss = ss_();
    var ev = String(data.evaluateur||"").replace(/[^0-9]/g,""); if(ev.length===1) ev="0"+ev;
    if(!ev) return out_({ok:false,error:"no evaluator"});
    var now = new Date();
    // 1) journal : tout envoi, brut
    sheet_(ss,"journal",["horodatage_serveur","evaluateur","kind","horodatage_client","updated","finished","n_complete","n_partial","json"])
      .appendRow([now, ev, data.kind||"", data.horodatage||"", data.updated||"", data.finished?1:0,
                  count_(data,"complete"), count_(data,"partial"), JSON.stringify(data)]);
    // 2) etat : dernier état complet par évaluateur (upsert)
    var et = sheet_(ss,"etat",["evaluateur","updated","finished","horodatage_serveur","state_json","payload_json"]);
    var row = findRow_(et, ev);
    var vals = [ev, data.updated||"", data.finished?1:0, now, JSON.stringify(data.state||{}), JSON.stringify(data)];
    if(row) et.getRange(row,1,1,vals.length).setValues([vals]); else et.appendRow(vals);
    // 3) feuilles plates + suivi pour cet évaluateur
    rebuildOne_(ss, ev, data, now);
    return out_({ok:true, ev:ev, saved:now.toISOString()});
  }catch(err){
    return out_({ok:false, error:String(err)});
  }finally{ try{lock.releaseLock();}catch(e2){} }
}

function doGet(e){
  var p = (e && e.parameter) || {};
  if(p.action === "state"){
    var ev = String(p.ev||"").replace(/[^0-9]/g,""); if(ev.length===1) ev="0"+ev;
    var et = ss_().getSheetByName("etat"); if(!et) return out_({ok:true, state:null});
    var row = findRow_(et, ev); if(!row) return out_({ok:true, state:null});
    var r = et.getRange(row,1,1,6).getValues()[0];
    var st = null; try{ st = JSON.parse(r[4]); }catch(x){}
    return out_({ok:true, state:st, updated:r[1], finished:r[2]});
  }
  return out_({ok:true, msg:"collecteur AgroecologIA Rwanda actif"});
}

/* ---------- reconstruction des feuilles plates ---------- */
function rebuildOne_(ss, ev, data, now){
  var rep = sheet_(ss,"reponses", repHeader_());
  var nug = sheet_(ss,"nuggets", ["horodatage","evaluateur","atelier","question","ordre","nugget_id","choix"]);
  var add = sheet_(ss,"ajouts",  ["horodatage","evaluateur","atelier","question","niveau","texte"]);
  var sui = sheet_(ss,"suivi",   ["evaluateur","profil_rempli","Q1","Q2","Q3","n_complete","dernier_contact","submit","derniere_action"]);
  deleteRowsWhere_(rep, 2, ev); deleteRowsWhere_(nug, 2, ev); deleteRowsWhere_(add, 2, ev);
  var p = data.profil || {}, qs = data.questions || [];
  var profRow = PROF.map(function(k){ return p[k]||""; });
  var statuts = [];
  qs.forEach(function(q){
    statuts.push(q.statut||"");
    if(q.statut==="empty") return;
    var row = [data.horodatage, ev, data.atelier].concat(profRow).concat([q.qid, q.ordre, q.statut, q.connaissance]);
    SLOTS.forEach(function(s){
      row.push(q["systeme_"+s]); row.push(q["id_"+s]);
      CRIT.forEach(function(c){ row.push((q["qualite_"+s]||{})[c]||""); });
    });
    rep.appendRow(row);
    var ng=q.nuggets||{};
    Object.keys(ng).forEach(function(nid){ if(ng[nid]) nug.appendRow([data.horodatage, ev, data.atelier, q.qid, q.ordre, nid, ng[nid]]); });
    (q.ajouts_libres||[]).forEach(function(a){ add.appendRow([data.horodatage, ev, data.atelier, q.qid, a.niveau, a.texte]); });
  });
  var profOK = ["p_sexe","p_struct","p_exp","p_dip","p_fam"].filter(function(k){return p[k];}).length >= 3 ? "yes" : "no";
  var nC = statuts.filter(function(s){return s==="complete";}).length;
  var srow = [ev, profOK, statuts[0]||"", statuts[1]||"", statuts[2]||"", nC, now, data.finished?"yes":"", data.kind||""];
  var r = findRow_(sui, ev);
  if(r) sui.getRange(r,1,1,srow.length).setValues([srow]); else sui.appendRow(srow);
}

/** Reconstruit TOUT depuis `etat` (à lancer à la main après l'atelier, ou si un onglet a été abîmé). */
function rebuild(){
  var ss = ss_(); var et = ss.getSheetByName("etat"); if(!et) return;
  ["reponses","nuggets","ajouts","suivi"].forEach(function(n){ var s=ss.getSheetByName(n); if(s) ss.deleteSheet(s); });
  var vals = et.getDataRange().getValues();
  for(var i=1;i<vals.length;i++){ try{ rebuildOne_(ss, String(vals[i][0]), JSON.parse(vals[i][5]), vals[i][3]); }catch(e){ Logger.log("ev "+vals[i][0]+" : "+e); } }
}

/* ---------- utilitaires ---------- */
function repHeader_(){
  var h=["horodatage","evaluateur","atelier"].concat(PROF).concat(["question","ordre","statut","connaissance"]);
  SLOTS.forEach(function(s){ h.push("systeme_"+s); h.push("id_"+s); CRIT.forEach(function(c){ h.push(s+"_"+c); }); });
  return h;
}
function sheet_(ss,name,header){
  var sh=ss.getSheetByName(name);
  if(!sh){ sh=ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  else if(sh.getLastRow()===0){ sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}
function findRow_(sh, ev){
  var n = sh.getLastRow(); if(n<2) return 0;
  var col = sh.getRange(2,1,n-1,1).getValues();
  for(var i=0;i<col.length;i++){ if(String(col[i][0])===ev) return i+2; }
  return 0;
}
function deleteRowsWhere_(sh, colIdx, ev){
  var n = sh.getLastRow(); if(n<2) return;
  var col = sh.getRange(2,colIdx,n-1,1).getValues();
  for(var i=col.length-1;i>=0;i--){ if(String(col[i][0])===ev) sh.deleteRow(i+2); }
}
function count_(data, st){ return (data.questions||[]).filter(function(q){return q.statut===st;}).length; }
function out_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
