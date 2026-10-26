'use strict';
/* =========================================================
   Laravel Mastery Tracker — Shared application core
   Storage, calculations, layout, UI helpers.
   ========================================================= */
const LMT = (() => {
  const KEY = 'lmt_data_v1';
  const listeners = [];
  let state = null;

  /* ---------------- Utilities ---------------- */
  let _seq = 0;
  const uid = (p = 'id') => p + '-' + Date.now().toString(36) + (_seq++).toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parse = s => { if (!s || typeof s !== 'string') return null; const [y, m, d] = s.split('-').map(Number); if (!y || !m || !d) return null; return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const weekStart = s => { const d = parse(s); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return ymd(d); };
  const fmt = (s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => { const d = parse(s); return d ? d.toLocaleDateString(undefined, opts) : '—'; };
  const fmtTs = ts => { const d = new Date(ts); return isNaN(d) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const num = (v, def = 0) => { const n = Number(v); return Number.isFinite(n) ? n : def; };
  const r1 = n => Math.round(n * 10) / 10;
  const pct = n => `${Math.round(num(n))}%`;
  const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const timeAgo = ts => { const s = (Date.now() - new Date(ts)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; if (s < 604800) return Math.floor(s / 86400) + 'd ago'; return fmtTs(ts); };

  /* ---------------- Content upgrade / generated learning paths ---------------- */
  const DATA_VERSION = 2;
  const LAB_GOALS = {
    A: 'Deliver it as a standalone, strictly typed PHP class (or small Composer-loadable package) with no Laravel dependency.',
    B: 'Deliver it as a Laravel service/form request/route slice with a Blade or JSON surface and a feature test.',
    C: 'Deliver a reproducible schema plus 3 queries that demonstrate the technique, including EXPLAIN output.',
    D: 'Deliver a refactored module, an ADR with trade-offs, and before/after metrics.',
    E: 'Deliver a versioned API endpoint, request validation, consistent error responses and contract-style tests.',
    F: 'Deliver a deliberately vulnerable demo, the secure implementation, and a test proving the attack is blocked.',
    G: 'Deliver a focused Pest/PHPUnit suite with meaningful assertions and coverage notes.',
    H: 'Deliver a small CLI tool or documented workflow runbook with reproducible commands.',
    I: 'Deliver an accessible, responsive UI component (Blade or plain HTML/JS) with keyboard support.',
    J: 'Deliver a repeatable deployment or container script plus a rollback runbook.',
    K: 'Deliver a benchmark: baseline numbers, the optimisation, and after numbers with methodology.',
    L: 'Deliver a tenant-aware feature with isolation tests and an entitlement/limit check.',
    M: 'Deliver a one-page design document plus a reference implementation or incident post-mortem.',
    N: 'Deliver an AI-backed service with input validation, output validation, retry handling and cost notes.',
    O: 'Deliver a working ecosystem integration with config, failure handling and a demo screenshot.',
    P: 'Deliver a written artefact (RFC, portfolio story, interview answer, mentoring plan) and collect feedback.'
  };
  function makeSteps(topic) {
    const title = topic.title || 'this topic';
    const code = String(topic.id || 'X-0').split('-')[0];
    const build = `Complete the component lab for ${title}: build the small, self-contained deliverable described in the lab, not just a throwaway snippet.`;
    return [
      { id: topic.id + '-st1', title: 'Study the fundamentals', detail: `Read the official documentation and one high-quality article or video on ${title}. Take notes in your own words.`, done: false, doneAt: null },
      { id: topic.id + '-st2', title: 'Explain it back', detail: `Write 5–10 lines explaining ${title}, including one common pitfall and one real production use case. If you cannot explain it simply, revisit the docs.`, done: false, doneAt: null },
      { id: topic.id + '-st3', title: 'Build the component lab', detail: build, done: false, doneAt: null },
      { id: topic.id + '-st4', title: 'Integrate into a real feature', detail: `Apply ${title} inside one of your portfolio projects. Handle validation, failure paths and edge cases — not only the happy path.`, done: false, doneAt: null },
      { id: topic.id + '-st5', title: 'Prove it with automated tests', detail: `Write at least one automated test covering the main behaviour and one edge/failure case for ${title}. Run the whole suite.`, done: false, doneAt: null },
      { id: topic.id + '-st6', title: 'Review, document & publish', detail: `Refactor for readability, write a short README/ADR with the trade-offs, make a clear Git commit and attach the repository or demo link as evidence.${code === 'P' ? '' : ''}`, done: false, doneAt: null }
    ];
  }
  function makeLab(topic) {
    const code = String(topic.id || 'X-0').split('-')[0];
    const goal = LAB_GOALS[code] || LAB_GOALS.B;
    const criteria = [
      'Self-contained implementation with a documented public interface or endpoint',
      'Input validation plus explicit handling for at least one failure case',
      'At least one automated test proves the main behaviour',
      'A short README or ADR explains the approach, trade-offs and one alternative',
      'Deliverable is pushed to GitHub and linked as evidence on this topic'
    ];
    return {
      title: `Lab ${topic.id}: ${topic.title} component`,
      brief: `Turn “${topic.title}” into a small reusable component you could ship or reuse. ${goal}`,
      deliverable: 'Repository or folder with the component, its tests, and a README containing usage and trade-offs.',
      criteria: criteria.map((text, i) => ({ id: `${topic.id}-c${i + 1}`, text, done: false }))
    };
  }
  function ensureTopicMeta(t) {
    if (!Array.isArray(t.steps) || !t.steps.length) t.steps = makeSteps(t);
    if (!t.lab || typeof t.lab !== 'object') t.lab = makeLab(t);
    if (!Array.isArray(t.lab.criteria) || !t.lab.criteria.length) t.lab.criteria = makeLab(t).criteria;
  }
  function stepStats(t) {
    const list = (t && t.steps) || [], done = list.filter(s => s.done).length, total = list.length;
    return { total, done, pct: total ? done / total * 100 : 0 };
  }
  function labStats(t) {
    const list = (t && t.lab && t.lab.criteria) || [], done = list.filter(s => s.done).length, total = list.length;
    return { total, done, pct: total ? done / total * 100 : 0 };
  }

  /* ---------------- Storage ---------------- */
  function normalize(s) {
    const incomingVersion = num(s.version, 1);
    const def = LMT_SEED.defaults();
    const out = Object.assign({}, def, s);
    out.settings = Object.assign({}, def.settings, s.settings || {});
    ['categories', 'topics', 'projects', 'projectHistory', 'skills', 'notes', 'activity', 'routineTemplate'].forEach(k => { if (!Array.isArray(out[k])) out[k] = def[k] || []; });
    ['days', 'weeklyReviews'].forEach(k => { if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {}; });
    const seen = new Set();
    out.topics = out.topics.filter(t => t && t.id && !seen.has(t.id) && seen.add(t.id));
    const cseen = new Set();
    out.categories = out.categories.filter(c => c && c.id && !cseen.has(c.id) && cseen.add(c.id));
    const pseen = new Set();
    out.projects = out.projects.filter(p => p && p.id && !pseen.has(p.id) && pseen.add(p.id));

    /* One-time upgrade: restore any missing default curriculum items, then enrich. */
    if (incomingVersion < DATA_VERSION) {
      let seed = null;
      try { seed = LMT_SEED.build(); } catch (e) { seed = null; }
      if (seed) {
        seed.categories.forEach(c => { if (!out.categories.some(x => x.id === c.id)) out.categories.push(c); });
        seed.topics.forEach(t => { if (!out.topics.some(x => x.id === t.id) && out.categories.some(c => c.id === t.categoryId)) out.topics.push(t); });
        seed.projects.forEach(p => { if (!out.projects.some(x => x.id === p.id)) out.projects.push(p); });
        seed.skills.forEach(k => { if (!out.skills.some(x => x.id === k.id)) out.skills.push(k); });
      }
    }

    out.topics.forEach(t => {
      t.prerequisites = Array.isArray(t.prerequisites) ? t.prerequisites : [];
      t.resources = Array.isArray(t.resources) ? t.resources : [];
      if (!['Not Started', 'In Progress', 'Completed'].includes(t.status)) t.status = 'Not Started';
      ensureTopicMeta(t);
    });
    out.projects.forEach(p => { ['features', 'testing', 'deployment', 'topics', 'history'].forEach(k => { if (!Array.isArray(p[k])) p[k] = []; }); });
    out.categories.forEach((c, i) => { if (!Number.isFinite(Number(c.order))) c.order = i + 1; });
    Object.keys(out.days).forEach(k => { const d = out.days[k]; if (!d || !Array.isArray(d.tasks)) delete out.days[k]; else d.date = k; });
    out.version = DATA_VERSION;
    return out;
  }
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
    state = normalize(raw && typeof raw === 'object' && Array.isArray(raw.topics) ? raw : LMT_SEED.build());
    persist();
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { toast('Could not save data — browser storage is full or unavailable.', 'danger'); return false; }
  }
  function emit() { listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } }); }
  function save() { const ok = persist(); emit(); return ok; }
  function onChange(fn) { listeners.push(fn); }
  function replaceState(obj) { state = normalize(obj); persist(); applyTheme(); emit(); }
  function validateBackup(obj) {
    if (!obj || typeof obj !== 'object') return 'File does not contain a JSON object.';
    if (!Array.isArray(obj.topics) || !Array.isArray(obj.categories)) return 'Backup is missing "topics" or "categories".';
    if (obj.days && typeof obj.days !== 'object') return 'Invalid "days" section.';
    return null;
  }
  window.addEventListener('storage', e => { if (e.key === KEY) { load(); applyTheme(); emit(); } });

  function log(type, text, ref = null) {
    state.activity.unshift({ id: uid('act'), ts: new Date().toISOString(), date: today(), type, text, ref });
    state.activity = state.activity.slice(0, 300);
  }

  /* ---------------- Lookups ---------------- */
  const topic = id => state.topics.find(t => t.id === id) || null;
  const category = id => state.categories.find(c => c.id === id) || null;
  const project = id => state.projects.find(p => p.id === id) || null;
  const sortedCategories = () => state.categories.slice().sort((a, b) => num(a.order) - num(b.order));

  /* ---------------- Calculations ---------------- */
  const topicProgress = t => t.status === 'Completed' ? 100 : clamp(num(t.progress), 0, 100);
  function statsFor(list) {
    const map = new Map(); list.forEach(t => { if (!map.has(t.id)) map.set(t.id, t); });
    const arr = [...map.values()];
    let completed = 0, inProgress = 0, notStarted = 0, sumP = 0, sumH = 0, sumPH = 0, doneH = 0;
    arr.forEach(t => {
      const p = topicProgress(t), h = Math.max(0, num(t.hours));
      if (t.status === 'Completed') { completed++; doneH += h; } else if (t.status === 'In Progress') inProgress++; else notStarted++;
      sumP += p; sumH += h; sumPH += p * h;
    });
    const total = arr.length;
    return { total, completed, inProgress, notStarted, totalHours: sumH, completedHours: doneH,
      completionPct: total ? completed / total * 100 : 0,
      weightedPct: total ? sumP / total : 0,
      hoursPct: sumH ? sumPH / sumH : 0 };
  }
  const topicStats = () => statsFor(state.topics);
  const categoryStats = () => sortedCategories().map(c => Object.assign({ category: c }, statsFor(state.topics.filter(t => t.categoryId === c.id))));
  const prereqsMissing = t => (t.prerequisites || []).map(topic).filter(p => p && p.status !== 'Completed');
  const isOverdue = (date, status) => !!date && status !== 'Completed' && date < today();

  const getDay = date => state.days[date] || null;
  function createDay(date, { fromTemplate = true } = {}) {
    if (state.days[date]) return state.days[date];
    const now = new Date().toISOString();
    state.days[date] = {
      date, tasks: fromTemplate ? state.routineTemplate.map(r => ({ id: uid('task'), title: r.title, minutes: num(r.minutes), done: false, topicId: r.topicId || '' })) : [],
      plannedMinutes: num(state.settings.dailyTarget, 180), actualMinutes: 0, topics: [],
      reflection: '', achievements: '', difficulties: '', nextSteps: '', notes: '',
      checkedIn: false, checkInAt: null, createdAt: now, updatedAt: now
    };
    return state.days[date];
  }
  function dayStats(rec) {
    const planned = rec ? num(rec.plannedMinutes, state.settings.dailyTarget) : num(state.settings.dailyTarget, 180);
    if (!rec) return { exists: false, total: 0, done: 0, pct: 0, actual: 0, planned, timePct: 0 };
    const total = rec.tasks.length, done = rec.tasks.filter(t => t.done).length, actual = Math.max(0, num(rec.actualMinutes));
    return { exists: true, total, done, pct: total ? done / total * 100 : 0, actual, planned, timePct: planned ? actual / planned * 100 : 0 };
  }
  function dayTopics(rec) {
    if (!rec) return [];
    const s = new Set(rec.topics || []); rec.tasks.forEach(t => { if (t.topicId) s.add(t.topicId); });
    return [...s];
  }
  function streaks() {
    const t = today();
    const dates = Object.values(state.days).filter(d => d.checkedIn && d.date <= t).map(d => d.date).sort();
    let longest = 0, run = 0, prev = null;
    dates.forEach(d => { run = prev && diffDays(prev, d) === 1 ? run + 1 : 1; longest = Math.max(longest, run); prev = d; });
    const set = new Set(dates); let cur = 0; let d = set.has(t) ? t : addDays(t, -1);
    while (set.has(d)) { cur++; d = addDays(d, -1); }
    return { current: cur, longest, checkins: dates.length, todayChecked: set.has(t) };
  }
  function streakAt(date) {
    let c = 0, d = date;
    while (state.days[d] && state.days[d].checkedIn) { c++; d = addDays(d, -1); }
    return c;
  }
  function totalStudyMinutes() { return Object.values(state.days).reduce((a, d) => a + Math.max(0, num(d.actualMinutes)), 0); }
  function weekStats(start) {
    const t = today();
    const dates = [...Array(7)].map((_, i) => addDays(start, i));
    const end = dates[6];
    let minutes = 0, tasksDone = 0, tasksTotal = 0, checkins = 0, best = null, missed = [];
    const daily = dates.map(date => {
      const rec = getDay(date), s = dayStats(rec);
      minutes += s.actual; tasksDone += s.done; tasksTotal += s.total;
      if (rec && rec.checkedIn) checkins++;
      else if (date <= t) missed.push(date);
      if (s.actual > 0 && (!best || s.actual > best.minutes)) best = { date, minutes: s.actual };
      return { date, rec, ...s };
    });
    const topicsCompleted = state.topics.filter(x => x.status === 'Completed' && x.completionDate >= start && x.completionDate <= end);
    const projIds = new Set(state.activity.filter(a => a.type === 'project' && a.ref && a.date >= start && a.date <= end).map(a => a.ref));
    const projects = [...projIds].map(project).filter(Boolean);
    const target = num((state.weeklyReviews[start] || {}).targetHours, num(state.settings.weeklyTargetHours, 21));
    return { start, end, dates, daily, minutes, hours: minutes / 60, tasksDone, tasksTotal, checkins, best, missed, topicsCompleted, projects, targetHours: target,
      taskPct: tasksTotal ? tasksDone / tasksTotal * 100 : 0, hoursPct: target ? (minutes / 60) / target * 100 : 0 };
  }
  const PRI = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  function recommend() {
    const catOrder = new Map(sortedCategories().map((c, i) => [c.id, i]));
    const idx = new Map(state.topics.map((t, i) => [t.id, i]));
    const ready = t => prereqsMissing(t).length === 0 ? 1 : 0;
    return state.topics.filter(t => t.status !== 'Completed').sort((a, b) =>
      ((b.status === 'In Progress') - (a.status === 'In Progress')) || (ready(b) - ready(a)) ||
      ((catOrder.get(a.categoryId) ?? 99) - (catOrder.get(b.categoryId) ?? 99)) || ((PRI[b.priority] || 0) - (PRI[a.priority] || 0)) || (idx.get(a.id) - idx.get(b.id)))[0] || null;
  }
  function deadlines(limit = 8) {
    const t = today(), items = [];
    state.topics.forEach(x => { if (x.targetDate && x.status !== 'Completed') items.push({ kind: 'topic', id: x.id, title: x.title, date: x.targetDate, href: `roadmap.html?topic=${encodeURIComponent(x.id)}` }); });
    state.projects.forEach(p => { if (p.targetDate && p.status !== 'Completed') items.push({ kind: 'project', id: p.id, title: p.name, date: p.targetDate, href: `projects.html?project=${encodeURIComponent(p.id)}` }); });
    items.forEach(i => { i.daysLeft = diffDays(t, i.date); i.overdue = i.daysLeft < 0; });
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
  }
  function projectItems(p) {
    const items = [];
    (p.features || []).forEach(f => { if (f.subtasks && f.subtasks.length) items.push(...f.subtasks); else items.push(f); });
    items.push(...(p.testing || []), ...(p.deployment || []));
    return items;
  }
  function projectProgress(p) {
    if (p.progressMode === 'manual') return clamp(num(p.manualProgress), 0, 100);
    const it = projectItems(p); return it.length ? it.filter(i => i.done).length / it.length * 100 : 0;
  }

  /* ---------------- URLs & safe rendering ---------------- */
  function isUrl(u) {
    if (!u || typeof u !== 'string') return false;
    try { const x = new URL(u.trim()); return (x.protocol === 'http:' || x.protocol === 'https:') && !!x.hostname; } catch (e) { return false; }
  }
  function link(u, label, icon = 'bi-box-arrow-up-right') {
    if (!u) return `<span class="link-missing"><i class="bi bi-dash-circle"></i> ${esc(label)} not set</span>`;
    if (!isUrl(u)) return `<span class="link-invalid" title="${esc(u)}"><i class="bi bi-exclamation-triangle"></i> Invalid ${esc(label)} URL</span>`;
    return `<a class="link-ext" href="${esc(u.trim())}" target="_blank" rel="noopener noreferrer"><i class="bi ${icon}"></i> ${esc(label)}</a>`;
  }
  function openUrl(u) {
    if (!u) { toast('No URL has been saved for this link.', 'warning'); return; }
    if (!isUrl(u)) { toast('This URL is invalid. Use a full http(s):// address.', 'danger'); return; }
    window.open(u.trim(), '_blank', 'noopener,noreferrer');
  }
  function inline(s) {
    return s.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
        const raw = url.replace(/&amp;/g, '&');
        return isUrl(raw) ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${txt}</a>` : m;
      });
  }
  /** Markdown-like renderer. Escapes ALL user HTML first; never executes user markup. */
  function md(src) {
    const blocks = [];
    let s = String(src || '').replace(/```([\w+-]*)[^\n]*\n?([\s\S]*?)```/g, (m, lang, code) => {
      blocks.push(`<pre class="code-block" tabindex="0"><span class="code-lang">${esc(lang || 'code')}</span><code>${esc(code.replace(/\n$/, ''))}</code></pre>`);
      return `\n\u0000${blocks.length - 1}\u0000\n`;
    });
    s = esc(s);
    let html = '', list = null, para = [];
    const flushP = () => { if (para.length) { html += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
    const flushL = () => { if (list) { html += `<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.t}>`; list = null; } };
    s.split('\n').forEach(line => {
      const b = line.match(/^\u0000(\d+)\u0000$/);
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      const ul = line.match(/^\s*[-*]\s+(.*)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      const q = line.match(/^&gt;\s?(.*)$/);
      if (b) { flushP(); flushL(); html += blocks[+b[1]]; }
      else if (h) { flushP(); flushL(); const lvl = Math.min(6, h[1].length + 3); html += `<h${lvl} class="md-h">${inline(h[2])}</h${lvl}>`; }
      else if (ul || ol) { flushP(); const t = ul ? 'ul' : 'ol'; if (!list || list.t !== t) { flushL(); list = { t, items: [] }; } list.items.push((ul || ol)[1]); }
      else if (q) { flushP(); flushL(); html += `<blockquote class="md-quote">${inline(q[1])}</blockquote>`; }
      else if (!line.trim()) { flushP(); flushL(); }
      else { flushL(); para.push(line); }
    });
    flushP(); flushL();
    return html.replace(/\u0000(\d+)\u0000/g, (m, i) => blocks[+i] || '');
  }

  /* ---------------- UI helpers ---------------- */
  function toast(msg, type = 'success') {
    let c = document.getElementById('toastContainer');
    if (!c) { c = document.createElement('div'); c.id = 'toastContainer'; c.className = 'toast-container position-fixed bottom-0 end-0 p-3'; document.body.appendChild(c); }
    const icons = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
    const el = document.createElement('div');
    el.className = `toast lmt-toast toast-${type}`;
    el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    el.setAttribute('aria-live', type === 'danger' ? 'assertive' : 'polite');
    el.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="bi ${icons[type] || icons.info} me-2"></i>${esc(msg)}</div><button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    c.appendChild(el);
    if (window.bootstrap) { const t = new bootstrap.Toast(el, { delay: 3800 }); el.addEventListener('hidden.bs.toast', () => el.remove()); t.show(); }
    else { el.classList.add('show'); setTimeout(() => el.remove(), 3800); }
  }
  function confirmDlg(message, { title = 'Please confirm', ok = 'Confirm', danger = false, requireText = null } = {}) {
    return new Promise(resolve => {
      if (!window.bootstrap) { resolve(window.confirm(message)); return; }
      let m = document.getElementById('lmtConfirm');
      if (!m) {
        m = document.createElement('div'); m.className = 'modal fade'; m.id = 'lmtConfirm'; m.tabIndex = -1;
        m.setAttribute('aria-labelledby', 'lmtConfirmTitle'); m.setAttribute('aria-hidden', 'true');
        m.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
          <div class="modal-header"><h2 class="modal-title h5" id="lmtConfirmTitle"></h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
          <div class="modal-body"><div id="lmtConfirmMsg"></div><div id="lmtConfirmReq" class="mt-3 d-none"><label class="form-label small" for="lmtConfirmInput"></label><input class="form-control" id="lmtConfirmInput" autocomplete="off"><div class="invalid-feedback">Text does not match.</div></div></div>
          <div class="modal-footer"><button type="button" class="btn btn-outline-lmt" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn" id="lmtConfirmOk"></button></div></div></div>`;
        document.body.appendChild(m);
      }
      m.querySelector('#lmtConfirmTitle').textContent = title;
      m.querySelector('#lmtConfirmMsg').innerHTML = esc(message).replace(/\n/g, '<br>');
      const okBtn = m.querySelector('#lmtConfirmOk');
      okBtn.textContent = ok; okBtn.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
      const req = m.querySelector('#lmtConfirmReq'), inp = m.querySelector('#lmtConfirmInput');
      req.classList.toggle('d-none', !requireText); inp.value = ''; inp.classList.remove('is-invalid');
      if (requireText) req.querySelector('label').textContent = `Type "${requireText}" to confirm`;
      const modal = bootstrap.Modal.getOrCreateInstance(m);
      let result = false;
      okBtn.onclick = () => { if (requireText && inp.value.trim() !== requireText) { inp.classList.add('is-invalid'); inp.focus(); return; } result = true; modal.hide(); };
      m.addEventListener('hidden.bs.modal', () => resolve(result), { once: true });
      m.addEventListener('shown.bs.modal', () => (requireText ? inp : okBtn).focus(), { once: true });
      modal.show();
    });
  }
  const STATUS_CLS = { 'Not Started': 'st-ns', 'In Progress': 'st-ip', 'Completed': 'st-done', 'Planned': 'st-ns', 'On Hold': 'st-hold' };
  const PRI_CLS = { Critical: 'pr-crit', High: 'pr-high', Medium: 'pr-med', Low: 'pr-low' };
  const DIFF_CLS = { Beginner: 'df-beg', Intermediate: 'df-int', Advanced: 'df-adv', Expert: 'df-exp' };
  const statusBadge = s => `<span class="badge-lmt ${STATUS_CLS[s] || 'st-ns'}">${esc(s)}</span>`;
  const priorityBadge = s => `<span class="badge-lmt ${PRI_CLS[s] || 'pr-low'}"><i class="bi bi-flag-fill"></i> ${esc(s)}</span>`;
  const diffBadge = s => `<span class="badge-lmt ${DIFF_CLS[s] || 'df-beg'}">${esc(s)}</span>`;
  const progressBar = (p, { cls = '', label = '', height = '' } = {}) => {
    const v = clamp(num(p), 0, 100);
    return `<div class="progress lmt-progress ${height}" role="progressbar" aria-label="${esc(label || 'Progress')}" aria-valuenow="${Math.round(v)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${cls}" style="width:${v}%"></div></div>`;
  };
  const emptyState = (icon, title, text = '', action = '') => `<div class="empty-state"><div class="empty-icon"><i class="bi ${icon}"></i></div><h3 class="h6 mb-1">${esc(title)}</h3>${text ? `<p class="mb-3">${esc(text)}</p>` : ''}${action}</div>`;
  const skeleton = (n = 3) => [...Array(n)].map(() => '<div class="skeleton mb-2"></div>').join('');
  function topicOptions(selected = [], { empty = null } = {}) {
    const sel = new Set([].concat(selected || []));
    let h = empty !== null ? `<option value="">${esc(empty)}</option>` : '';
    sortedCategories().forEach(c => {
      const ts = state.topics.filter(t => t.categoryId === c.id);
      if (!ts.length) return;
      h += `<optgroup label="${esc(c.name)}">` + ts.map(t => `<option value="${esc(t.id)}" ${sel.has(t.id) ? 'selected' : ''}>${esc(t.id)} · ${esc(t.title)}</option>`).join('') + '</optgroup>';
    });
    return h;
  }
  function projectOptions(selected = '', { empty = null } = {}) {
    return (empty !== null ? `<option value="">${esc(empty)}</option>` : '') + state.projects.map(p => `<option value="${esc(p.id)}" ${p.id === selected ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  }
  function download(filename, text, type = 'application/json') {
    const blob = new Blob([text], { type }); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
  }
  const param = k => new URLSearchParams(location.search).get(k);
  /** Validate URL inputs in a form; returns true when all OK */
  function validateUrlInputs(form) {
    let ok = true;
    form.querySelectorAll('[data-url]').forEach(inp => {
      const lines = inp.tagName === 'TEXTAREA' ? inp.value.split('\n').map(x => x.trim()).filter(Boolean) : [inp.value.trim()].filter(Boolean);
      const bad = lines.some(l => !isUrl(l));
      inp.setCustomValidity(bad ? 'Enter a valid http(s):// URL' : ''); if (bad) ok = false;
    });
    return ok;
  }

  /* ---------------- Charts ---------------- */
  const charts = {};
  function chartColors() {
    const dark = theme() === 'dark';
    return { text: dark ? '#94A3B8' : '#475569', grid: dark ? 'rgba(148,163,184,.12)' : 'rgba(11,20,29,.08)', primary: '#037880', secondary: '#00A3B4', accent: '#FF9F43', light: '#E6F2F3', muted: '#94A3B8', surface: dark ? '#111D28' : '#FFFFFF' };
  }
  function chart(id, cfg) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (typeof Chart === 'undefined') { el.parentElement.innerHTML = '<div class="empty-state small"><i class="bi bi-wifi-off"></i> Charts unavailable — Chart.js could not be loaded from the CDN.</div>'; return null; }
    const c = chartColors();
    Chart.defaults.color = c.text; Chart.defaults.borderColor = c.grid;
    Chart.defaults.font.family = "Inter, 'Segoe UI', system-ui, sans-serif";
    if (charts[id]) charts[id].destroy();
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 600 } }, cfg.options || {});
    charts[id] = new Chart(el, cfg);
    return charts[id];
  }

  /* ---------------- Theme & layout ---------------- */
  const theme = () => (state && state.settings.theme) || 'dark';
  function applyTheme() {
    document.documentElement.setAttribute('data-bs-theme', theme());
    const b = document.getElementById('themeToggle');
    if (b) { b.innerHTML = `<i class="bi ${theme() === 'dark' ? 'bi-sun' : 'bi-moon-stars'}"></i>`; b.setAttribute('aria-label', `Switch to ${theme() === 'dark' ? 'light' : 'dark'} theme`); }
  }
  function setTheme(t) { state.settings.theme = t === 'light' ? 'light' : 'dark'; applyTheme(); save(); }
  const NAV = [
    { href: 'index.html', page: 'dashboard', icon: 'bi-grid-1x2', label: 'Dashboard' },
    { href: 'roadmap.html', page: 'roadmap', icon: 'bi-signpost-split', label: 'Roadmap' },
    { href: 'daily-routine.html', page: 'routine', icon: 'bi-calendar-check', label: 'Daily Routine' },
    { href: 'weekly-review.html', page: 'weekly', icon: 'bi-journal-check', label: 'Weekly Review' },
    { href: 'projects.html', page: 'projects', icon: 'bi-kanban', label: 'Projects' },
    { href: 'skills.html', page: 'skills', icon: 'bi-bar-chart-steps', label: 'Skills' },
    { href: 'notes.html', page: 'notes', icon: 'bi-sticky', label: 'Notes' },
    { href: 'analytics.html', page: 'analytics', icon: 'bi-graph-up-arrow', label: 'Analytics' },
    { href: 'settings.html', page: 'settings', icon: 'bi-gear', label: 'Settings' }
  ];
  const initials = n => (String(n || 'LD').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || 'LD').toUpperCase();
  function renderLayout() {
    const page = document.body.dataset.page;
    const sb = document.getElementById('sidebar');
    if (sb) {
      sb.innerHTML = `<div class="sidebar-brand"><a href="index.html" class="brand" aria-label="Laravel Mastery Tracker home"><span class="brand-logo"><i class="bi bi-layers-fill"></i></span><span class="brand-text"><strong>Laravel Mastery</strong><small>Senior Roadmap</small></span></a>
        <button class="btn btn-icon d-lg-none" id="sidebarClose" aria-label="Close navigation"><i class="bi bi-x-lg"></i></button></div>
        <nav class="sidebar-nav" aria-label="Primary"><ul>${NAV.map(n => `<li><a href="${n.href}" class="nav-link-lmt ${n.page === page ? 'active' : ''}" ${n.page === page ? 'aria-current="page"' : ''} title="${n.label}"><i class="bi ${n.icon}" aria-hidden="true"></i><span>${n.label}</span></a></li>`).join('')}</ul></nav>
        <div class="sidebar-footer" id="sidebarFooter"></div>`;
    }
    const tb = document.getElementById('topbar');
    if (tb) {
      const title = document.body.dataset.title || 'Laravel Mastery Tracker';
      const sub = document.body.dataset.subtitle || '';
      tb.innerHTML = `<div class="d-flex align-items-center gap-2 min-w-0">
          <button class="btn btn-icon" id="sidebarToggle" aria-label="Toggle navigation" aria-controls="sidebar"><i class="bi bi-list"></i></button>
          <div class="min-w-0"><h1 class="topbar-title text-truncate">${esc(title)}</h1>${sub ? `<div class="topbar-sub d-none d-sm-block text-truncate">${esc(sub)}</div>` : ''}</div></div>
        <div class="d-flex align-items-center gap-2">
          <span class="topbar-date d-none d-md-inline-flex"><i class="bi bi-calendar3"></i> ${new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <button class="btn btn-icon" id="themeToggle" aria-label="Toggle theme"></button>
          <div class="dropdown"><button class="avatar-btn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Profile menu"><span class="avatar" id="avatarInitials">${esc(initials(state.settings.name))}</span></button>
            <ul class="dropdown-menu dropdown-menu-end shadow"><li class="px-3 py-2"><strong id="profileName">${esc(state.settings.name)}</strong><div class="small text-muted-lmt">${esc(state.settings.role || '')}</div></li><li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="settings.html"><i class="bi bi-gear me-2"></i>Settings</a></li><li><a class="dropdown-item" href="analytics.html"><i class="bi bi-graph-up me-2"></i>Analytics</a></li><li><a class="dropdown-item" href="daily-routine.html"><i class="bi bi-calendar-check me-2"></i>Today's routine</a></li></ul></div></div>`;
    }
    document.body.classList.toggle('sidebar-collapsed', !!state.settings.sidebarCollapsed);
    applyTheme();
    const toggle = document.getElementById('sidebarToggle');
    const close = () => { document.body.classList.remove('sidebar-open'); toggle && toggle.setAttribute('aria-expanded', 'false'); };
    toggle && toggle.addEventListener('click', () => {
      if (window.innerWidth < 992) { const open = document.body.classList.toggle('sidebar-open'); toggle.setAttribute('aria-expanded', String(open)); if (open) { const f = sb.querySelector('a'); f && f.focus(); } }
      else { state.settings.sidebarCollapsed = !state.settings.sidebarCollapsed; document.body.classList.toggle('sidebar-collapsed', state.settings.sidebarCollapsed); persist(); setTimeout(() => Object.values(charts).forEach(c => c.resize()), 260); }
    });
    const cl = document.getElementById('sidebarClose'); cl && cl.addEventListener('click', close);
    const bd = document.getElementById('sidebarBackdrop'); bd && bd.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) { close(); toggle && toggle.focus(); } });
    const th = document.getElementById('themeToggle'); th && th.addEventListener('click', () => setTheme(theme() === 'dark' ? 'light' : 'dark'));
    updateSidebar();
  }
  function updateSidebar() {
    const f = document.getElementById('sidebarFooter'); if (!f) return;
    const s = topicStats(), st = streaks();
    f.innerHTML = `<div class="sf-card"><div class="d-flex justify-content-between small mb-1"><span>Roadmap</span><strong>${pct(s.completionPct)}</strong></div>${progressBar(s.completionPct, { label: 'Roadmap completion' })}
      <div class="d-flex justify-content-between small mt-2 text-muted-lmt"><span><i class="bi bi-fire text-accent"></i> ${st.current}-day streak</span><span>${s.completed}/${s.total}</span></div></div>`;
    const a = document.getElementById('avatarInitials'); if (a) a.textContent = initials(state.settings.name);
    const pn = document.getElementById('profileName'); if (pn) pn.textContent = state.settings.name;
  }

  /* ---------------- Init ---------------- */
  load();
  renderLayout();
  onChange(updateSidebar);

  return {
    get state() { return state; }, KEY, save, persist, onChange, replaceState, validateBackup, log,
    uid, esc, ymd, today, parse, addDays, diffDays, weekStart, fmt, fmtTs, timeAgo, clamp, num, r1, pct, debounce, param,
    topic, category, project, sortedCategories, topicProgress, topicStats, categoryStats, statsFor, prereqsMissing, isOverdue,
    DATA_VERSION, makeSteps, makeLab, ensureTopicMeta, stepStats, labStats,
    getDay, createDay, dayStats, dayTopics, streaks, streakAt, totalStudyMinutes, weekStats, recommend, deadlines,
    projectItems, projectProgress, isUrl, link, openUrl, md, toast, confirm: confirmDlg,
    statusBadge, priorityBadge, diffBadge, progressBar, emptyState, skeleton, topicOptions, projectOptions, download, validateUrlInputs,
    chart, chartColors, theme, setTheme, initials, PRI
  };
})();
