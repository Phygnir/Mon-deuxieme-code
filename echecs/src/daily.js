// ---------- Plan du jour et série de jours ----------
// Trois objectifs par jour : la révision du jour, 5 problèmes classés, une leçon ou une partie.
// Tous remplis : la série de jours continue (comme Duolingo).
const DAY_PZ = 5;
Object.assign(ICON, {
  flame: svgI('<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-1 2-2 3-4 3 0-2-1-4-3-6-1 4-5 7-5 12 0 5 4 8 9 8z"/>'),
  save: svgI('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>')
});
if (!save.streakDays) save.streakDays = { n: 0, best: 0, last: null };
function dayNow() {
  const d = revToday();
  if (!save.day || save.day.d !== d) save.day = { d, rev: 0, revGoal: Math.min(5, revDue().length), pz: 0, les: 0, done: false };
  return save.day;
}
// Série affichée : elle tient si le dernier jour complet est aujourd'hui ou hier
const streakNow = () => { const s = save.streakDays; return s.last != null && s.last >= revToday() - 1 ? s.n : 0; };
const dayGoals = D => [
  { k: "rev", ok: D.revGoal === 0 || D.rev >= D.revGoal },
  { k: "pz", ok: D.pz >= DAY_PZ },
  { k: "les", ok: D.les >= 1 }
];
function dayInc(k) {
  const D = dayNow();
  D[k] = (D[k] || 0) + 1;
  if (!D.done && dayGoals(D).every(g => g.ok)) {
    D.done = true;
    const s = save.streakDays, today = D.d;
    s.n = s.last === today - 1 ? s.n + 1 : s.last === today ? s.n : 1;
    s.last = today; s.best = Math.max(s.best, s.n);
    D.justDone = true;
  }
  persist();
}
function planCard() {
  const D = dayNow(), goals = dayGoals(D), n = streakNow();
  const next = PATHS.flatMap(p => p.lessons).find(l => !save.lessons[l.id]);
  const row = (ok, title, prog, btn) => `<li class="${ok ? "ok" : ""}"><span class="plan-dot">${ok ? ICON.check : ""}</span><span class="plan-t">${title}${prog ? `<small>${prog}</small>` : ""}</span>${ok ? "" : btn}</li>`;
  const rows = [
    D.revGoal ? row(goals[0].ok, `Réviser ${D.revGoal} élément${D.revGoal > 1 ? "s" : ""}`, `${Math.min(D.rev, D.revGoal)}/${D.revGoal}`, `<button class="btn" data-plan="rev">Réviser</button>`)
      : row(true, "Rien à réviser aujourd'hui", "", ""),
    row(goals[1].ok, `Faire ${DAY_PZ} problèmes classés`, `${Math.min(D.pz, DAY_PZ)}/${DAY_PZ}`, `<button class="btn" data-plan="pz">Problèmes</button>`),
    row(goals[2].ok, "Faire une leçon ou une partie", "", `<button class="btn" data-plan="les">${next ? "Leçon" : "Jouer"}</button>`)
  ];
  const done = goals.every(g => g.ok);
  return `<div class="plan${done ? " done" : ""}">
    <div class="plan-head"><div><p class="eyebrow">Plan du jour</p><b>${done ? "Bravo, ta journée est faite !" : `${goals.filter(g => g.ok).length}/3 objectifs`}</b></div>
      <span class="streak${n ? " on" : ""}" title="Jours d'affilée avec le plan terminé. Record : ${save.streakDays.best}">${ICON.flame}<b>${n}</b><small>jour${n > 1 ? "s" : ""}</small></span></div>
    <ul class="plan-list">${rows.join("")}</ul>
    ${done ? `<p class="calm">Reviens demain pour prolonger ta série${n > 1 ? ` de ${n} jours` : ""}.</p>` : n ? `<p class="calm">Termine les trois objectifs pour passer à ${n + 1} jours d'affilée.</p>` : ""}
  </div>`;
}
function bindPlan() {
  const D = dayNow();
  if (D.justDone) { D.justDone = false; persist(); celebrate(); sound("win"); }
  panel.querySelectorAll("[data-plan]").forEach(b => b.onclick = () => {
    const k = b.dataset.plan;
    if (k === "rev") revStart();
    else if (k === "pz") { Q.mode = "train"; setMode("problemes"); }
    else { const next = PATHS.flatMap(p => p.lessons).find(l => !save.lessons[l.id]); if (next) startLesson(next.id); else setMode("jouer"); }
  });
}

// ---------- Sauvegarde de la progression dans un fichier ----------
// Tout vit dans le navigateur (localStorage) : un fichier .json permet de le garder à l'abri
// ou de le reprendre sur un autre appareil.
function backupCard() {
  const last = save.lastBackup ? new Date(save.lastBackup).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;
  const old = !save.lastBackup || Date.now() - save.lastBackup > 14 * 864e5;
  return `<div class="backup">
    <div><b>Ta progression</b><span>${last ? `Dernière sauvegarde le ${last}.` : "Elle est gardée dans ce navigateur seulement."}${old && (save.pz && save.pz.n > 5 || Object.keys(save.lessons).length > 3) ? " Pense à la sauvegarder." : ""}</span></div>
    <div class="row"><button class="btn" id="bk-save">${ICON.save}Sauvegarder</button><label class="btn file-btn">${ICON.upload}Restaurer<input type="file" id="bk-load" accept=".json,application/json"></label></div>
    <div id="bk-msg"></div>
  </div>`;
}
function bindBackup() {
  const sv = $("#bk-save"); if (sv) sv.onclick = backupSave;
  const ld = $("#bk-load"); if (ld) ld.onchange = e => { const f = e.target.files[0]; if (f) f.text().then(backupLoad); };
}
const bkMsg = (c, t) => { const m = $("#bk-msg"); if (m) m.innerHTML = `<div class="fb ${c}"><span>${t}</span></div>`; };
async function backupSave() {
  const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const data = JSON.stringify({ app: "ecole-echecs", version: 1, date: Date.now(), save });
  const filename = `ecole-echecs-${stamp}.json`;
  let ok = false;
  // Dans claude.ai, le téléchargement passe par la plateforme ; ailleurs, par un lien classique
  const dl = window.claude && window.claude.use ? await window.claude.use("downloads").catch(() => null) : null;
  if (dl) {
    try { await dl.save({ filename, data }); ok = true; }
    catch (e) { if (e && e.code === "declined") return bkMsg("warn", "Sauvegarde annulée."); if (e && e.code === "rate_limited") return bkMsg("warn", "Une fenêtre de téléchargement est déjà ouverte."); }
  }
  if (!ok) {
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "application/json" })); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      ok = true;
    } catch (e) { return bkMsg("bad", "Le téléchargement n'est pas possible ici."); }
  }
  save.lastBackup = Date.now(); persist();
  bkMsg("ok", `${ICON.check} Fichier « ${filename} » enregistré. Garde-le précieusement : il contient toute ta progression.`);
}
function backupLoad(text) {
  let o;
  try { o = JSON.parse(text); } catch (e) { return bkMsg("bad", "Ce fichier n'est pas une sauvegarde de l'École des Échecs."); }
  if (!o || o.app !== "ecole-echecs" || !o.save || typeof o.save !== "object") return bkMsg("bad", "Ce fichier n'est pas une sauvegarde de l'École des Échecs.");
  const s = o.save, when = new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const m = $("#bk-msg");
  m.innerHTML = `<div class="fb warn"><span>Restaurer la sauvegarde du ${when} ? Ta progression actuelle sera remplacée.<small>${Object.keys(s.lessons || {}).length} leçons, ${s.pz ? s.pz.n : 0} problèmes classés (classement ${s.pz ? s.pz.r : "—"}), ${(s.games || []).length} parties.</small></span></div>
    <div class="row"><button class="btn primary" id="bk-yes">Restaurer</button><button class="btn" id="bk-no">Annuler</button></div>`;
  $("#bk-no").onclick = () => { m.innerHTML = ""; };
  $("#bk-yes").onclick = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign({}, s, { lastBackup: o.date }))); } catch (e) { return bkMsg("bad", "Impossible d'écrire dans ce navigateur."); }
    location.reload();
  };
}
