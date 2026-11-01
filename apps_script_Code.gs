/****************************************************************
 * CRESI AgroecologIA — collecteur RWANDA / One Acre Fund (Google Sheet)   — v2 (31/10/2026)
 * 2 systèmes comparés en aveugle par question (slots A / B), 3 questions par évaluateur.
 *
 * GARDE-FOUS (leçon Oléiculture : réponses d'une évaluatrice perdues) :
 *  - le site POSTe l'état COMPLET de l'évaluateur (autosave, « Save this question », Submit)
 *    → onglet `etat` : 1 ligne FIXE par évaluateur (ligne = n° + 1), écrasée à chaque envoi,
 *      SAUF si l'envoi est plus ancien que ce qui est déjà stocké (envois arrivés dans le désordre) ;
 *    → onglet `journal` : 1 ligne par envoi, jamais écrasée (sert à tout reconstruire).
 *  - GET ?action=state&ev=07 renvoie le dernier état → restauration si navigateur vidé / autre appareil.
 *  - `suivi` : tableau de bord animateur, 1 ligne fixe par évaluateur, mis à jour à chaque envoi.
 *  - `reponses` / `nuggets` / `ajouts` (format plat des autres ateliers) : reconstruits EN BLOC
 *    depuis `etat` par GET ?action=rebuild ou la fonction rebuild() — plus à chaque envoi.
 *
 * v2 — test de charge du 31/10 : la v1 mettait 29 à 53 s par envoi (une écriture de ligne par
 * nugget, sous verrou global) → saturation garantie à 45 évaluateurs. La v2 écrit 1 ligne fixe
 * sans verrou (évaluateurs différents = lignes différentes) ; seul l'ajout au journal est verrouillé.
 * Colonnes texte forcées (sinon « 01 » devenait 1 et les évaluateurs 01-09 n'étaient pas retrouvés).
 * v3 — saisie des livrets papier par le même site (?ev=07&saisie=1 → ligne de l'évaluateur 07 ;
 * ?ev=07&saisie=2 → seconde saisie de contrôle stockée en 507, exclue de `reponses`).
 * v4 — bloc « paramètres pratiques exigés » (méthode nuggets v8, option D+E) → onglet `parametres`
 * (1 ligne par évaluateur × question : IDs cochés séparés par « ; », ou NONE, + justification).
 *
 * Mise à jour : coller ce code → Enregistrer → Déployer → Gérer les déploiements → crayon →
 * Version : Nouvelle version → Déployer (l'URL /exec ne change pas).
 ****************************************************************/
var SHEET_ID = "1qWj4uZ7u8mK6gmo4Fci9qL8FcE0fpCBR6c-oSK755uQ";   // AgroecologIA_Rwanda_1AF_evaluations
var CRIT  = ["Relevance","Clarity","Actionability","Trust","Length"];
var SLOTS = ["A","B"];
var PROF  = ["p_code","p_sexe","p_date","p_lieu","p_struct","p_spe","p_exp","p_dip","p_fam","p_agent","p_agent_autre","p_conf","p_conf_raison"];
var H_ETAT  = ["evaluateur","updated","finished","horodatage_serveur","state_json","payload_json"];
var H_JOUR  = ["horodatage_serveur","evaluateur","kind","horodatage_client","updated","finished","n_complete","n_partial","accepte","json"];
var H_SUIVI = ["evaluateur","profil_rempli","Q1","Q2","Q3","n_complete","dernier_contact","submit","derniere_action"];

function ss_(){ return SpreadsheetApp.openById(SHEET_ID); }
function evId_(x){ var ev=String(x||"").replace(/[^0-9]/g,""); if(ev.length===1) ev="0"+ev; return ev; }
function rowOf_(ev){ var n=parseInt(ev,10); return (n>=1 && n<=999) ? n+1 : 0; }   // ligne fixe

function doPost(e){
  try{
    var data = JSON.parse(e.postData.contents);
    var ev = evId_(data.evaluateur);
    var row = rowOf_(ev);
    if(!row) return out_({ok:false,error:"bad evaluator"});
    var ss = ss_(), now = new Date();
    // 1) etat : ligne fixe, refus des envois plus anciens que l'état stocké
    var et = sheet_(ss,"etat",H_ETAT);
    var cur = et.getRange(row,1,1,6).getValues()[0];
    var curUpd = "";
    try{ curUpd = (JSON.parse(cur[4]||"{}")||{})._updated || ""; }catch(x){}
    var newUpd = (data.state && data.state._updated) || data.updated || "";
    var accept = !curUpd || !newUpd || String(newUpd) >= String(curUpd) || (data.finished && !cur[2]);
    if(accept){
      et.getRange(row,1,1,6).setValues([[ev, String(newUpd), data.finished?1:0, now,
                                          JSON.stringify(data.state||{}), JSON.stringify(data)]]);
      // 2) suivi : ligne fixe
      var sui = sheet_(ss,"suivi",H_SUIVI);
      sui.getRange(row,1,1,H_SUIVI.length).setValues([suiviRow_(ev, data, now)]);
    }
    // 3) journal : seul passage verrouillé (ajout de ligne)
    var lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try{
      sheet_(ss,"journal",H_JOUR).appendRow([now, ev, data.kind||"", data.horodatage||"", String(newUpd),
        data.finished?1:0, count_(data,"complete"), count_(data,"partial"), accept?1:0, JSON.stringify(data)]);
    } finally { lock.releaseLock(); }
    return out_({ok:true, ev:ev, saved:now.toISOString(), stale:!accept});
  }catch(err){
    return out_({ok:false, error:String(err)});
  }
}

function doGet(e){
  var p = (e && e.parameter) || {};
  if(p.action === "state"){
    var ev = evId_(p.ev), row = rowOf_(ev);
    if(!row) return out_({ok:true, state:null});
    var et = ss_().getSheetByName("etat"); if(!et || et.getMaxRows() < row) return out_({ok:true, state:null});
    var r = et.getRange(row,1,1,6).getValues()[0];
    if(!r[4]) return out_({ok:true, state:null});
    var st = null; try{ st = JSON.parse(r[4]); }catch(x){}
    return out_({ok:true, state:st, updated:String(r[1]), finished:r[2]});
  }
  if(p.action === "rebuild"){ var n = rebuild(); return out_({ok:true, rebuilt:n}); }
  return out_({ok:true, msg:"collecteur AgroecologIA Rwanda actif (v4)"});
}

/* ---------- reconstruction en bloc des feuilles plates ---------- */
function rebuild(){
  var ss = ss_(); var et = ss.getSheetByName("etat"); if(!et) return 0;
  var vals = et.getDataRange().getValues();
  var rep=[repHeader_()], nug=[["horodatage","evaluateur","atelier","question","ordre","nugget_id","choix"]],
      add=[["horodatage","evaluateur","atelier","question","niveau","texte"]],
      par=[["horodatage","evaluateur","atelier","question","ordre","nuggets_parametres_exiges","pourquoi"]], n=0;
  for(var i=1;i<vals.length;i++){
    if(!vals[i][5]) continue;
    var data; try{ data = JSON.parse(vals[i][5]); }catch(x){ continue; }
    var ev = evId_(vals[i][0]);
    if(parseInt(ev,10) >= 500) continue;          // 5NN = seconde saisie de contrôle d'un livret papier
    n++;
    var p = data.profil || {}, profRow = PROF.map(function(k){ return p[k]||""; });
    (data.questions||[]).forEach(function(q){
      if(q.statut==="empty") return;
      var r = [data.horodatage, ev, data.atelier].concat(profRow).concat([q.qid, q.ordre, q.statut, q.connaissance]);
      SLOTS.forEach(function(s){ r.push(q["systeme_"+s]); r.push(q["id_"+s]);
        CRIT.forEach(function(c){ r.push((q["qualite_"+s]||{})[c]||""); }); });
      r.push(data.mode||"online"); r.push(data.operateur||"");
      rep.push(r);
      var ng=q.nuggets||{};
      Object.keys(ng).forEach(function(nid){ if(ng[nid]) nug.push([data.horodatage, ev, data.atelier, q.qid, q.ordre, nid, ng[nid]]); });
      (q.ajouts_libres||[]).forEach(function(a){ add.push([data.horodatage, ev, data.atelier, q.qid, a.niveau, a.texte]); });
      if(q.parametres || q.parametres_pourquoi) par.push([data.horodatage, ev, data.atelier, q.qid, q.ordre, q.parametres||"", q.parametres_pourquoi||""]);
    });
  }
  write_(ss,"reponses",rep); write_(ss,"nuggets",nug); write_(ss,"ajouts",add); write_(ss,"parametres",par);
  return n;
}
function write_(ss,name,rows){
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  if(rows.length){ sh.getRange(1,1,rows.length,1).setNumberFormat("@");
    sh.getRange(1,1,rows.length,rows[0].length).setValues(rows); sh.setFrozenRows(1); }
}
function suiviRow_(ev, data, now){
  var p = data.profil || {}, st = (data.questions||[]).map(function(q){ return q.statut||""; });
  var profOK = ["p_sexe","p_struct","p_exp","p_dip","p_fam"].filter(function(k){return p[k];}).length >= 3 ? "yes" : "no";
  return [ev, profOK, st[0]||"", st[1]||"", st[2]||"", st.filter(function(s){return s==="complete";}).length,
          now, data.finished?"yes":"", (data.kind||"") + (data.mode && data.mode!=="online" ? " · "+data.mode : "")];
}

/* ---------- utilitaires ---------- */
function repHeader_(){
  var h=["horodatage","evaluateur","atelier"].concat(PROF).concat(["question","ordre","statut","connaissance"]);
  SLOTS.forEach(function(s){ h.push("systeme_"+s); h.push("id_"+s); CRIT.forEach(function(c){ h.push(s+"_"+c); }); });
  h.push("mode"); h.push("operateur_saisie");
  return h;
}
function sheet_(ss,name,header){
  var sh=ss.getSheetByName(name);
  if(!sh){ sh=ss.insertSheet(name); }
  if(sh.getLastRow()===0){ sh.getRange(1,1,1,header.length).setValues([header]); sh.setFrozenRows(1);
    sh.getRange("A:B").setNumberFormat("@"); }
  return sh;
}
function count_(data, st){ return (data.questions||[]).filter(function(q){return q.statut===st;}).length; }
function out_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/** À lancer UNE fois à la main (ou après le test de charge) : remet `etat` et `suivi` à zéro
 *  (le journal est conservé). Ne PAS lancer pendant l'atelier. */
function reinitialiser_etat_suivi(){
  var ss = ss_();
  ["etat","suivi","reponses","nuggets","ajouts","parametres"].forEach(function(n){ var s=ss.getSheetByName(n); if(s) ss.deleteSheet(s); });
  var j = ss.getSheetByName("journal");
  if(j) j.setName("journal_tests_" + Utilities.formatDate(new Date(), "Europe/Paris", "yyyyMMdd_HHmm"));
  sheet_(ss,"etat",H_ETAT); sheet_(ss,"suivi",H_SUIVI); sheet_(ss,"journal",H_JOUR);
  ss.getSheetByName("etat").getRange("A:A").setNumberFormat("@");
}
