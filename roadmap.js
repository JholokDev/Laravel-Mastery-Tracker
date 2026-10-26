'use strict';
/* Roadmap page — search, filter, sort, edit topics & categories, bulk actions */
(() => {
  const L = LMT, $ = id => document.getElementById(id), esc = L.esc;
  const expanded = new Set(), selected = new Set();
  const topicModal = new bootstrap.Modal($('topicModal'));
  const catModal = new bootstrap.Modal($('categoryModal'));
  const details = new bootstrap.Offcanvas($('topicDetails'));
  let detailId = null;

  /* ---------- Filters ---------- */
  const filters = () => ({ q: $('fSearch').value.trim().toLowerCase(), status: $('fStatus').value, diff: $('fDifficulty').value, cat: $('fCategory').value, pri: $('fPriority').value, sort: $('fSort').value });
  const hasFilter = f => !!(f.q || f.status || f.diff || f.pri);
  function match(t, f) {
    if (f.q && !(`${t.id} ${t.title} ${t.description || ''}`.toLowerCase().includes(f.q))) return false;
    if (f.status === 'overdue') { if (!L.isOverdue(t.targetDate, t.status)) return false; }
    else if (f.status && t.status !== f.status) return false;
    if (f.diff && t.difficulty !== f.diff) return false;
    if (f.pri && t.priority !== f.pri) return false;
    return true;
  }
  function sortList(arr, s) {
    const c = arr.slice();
    if (s === 'title') c.sort((a, b) => a.title.localeCompare(b.title));
    else if (s === 'deadline') c.sort((a, b) => (a.targetDate || '9999-12-31').localeCompare(b.targetDate || '9999-12-31'));
    else if (s === 'priority') c.sort((a, b) => (L.PRI[b.priority] || 0) - (L.PRI[a.priority] || 0));
    else if (s === 'hours') c.sort((a, b) => L.num(b.hours) - L.num(a.hours));
    return c;
  }
  function fillCategorySelects() {
    const opts = L.sortedCategories().map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    const cur = $('fCategory').value;
    $('fCategory').innerHTML = '<option value="">All</option>' + opts;
    if (L.category(cur)) $('fCategory').value = cur;
    $('tCategory').innerHTML = opts;
  }

  /* ---------- Rendering ---------- */
  function topicRow(t) {
    const over = L.isOverdue(t.targetDate, t.status), miss = L.prereqsMissing(t), p = L.topicProgress(t), st = L.stepStats(t), lb = L.labStats(t);
    return `<div class="topic-row ${over ? 'overdue' : ''} ${t.status === 'Completed' ? 'done' : ''}" data-id="${esc(t.id)}">
      <input type="checkbox" class="form-check-input bulk-check" ${selected.has(t.id) ? 'checked' : ''} aria-label="Select ${esc(t.title)}">
      <div class="flex-grow-1 min-w-0"><div><span class="topic-id me-1">${esc(t.id)}</span><button class="topic-title" data-act="details">${esc(t.title)}</button>${t.custom ? '' : ' <i class="bi bi-lock-fill small text-muted-lmt" title="Core roadmap topic — protected so the curriculum stays complete" aria-label="Protected core topic"></i>'}</div>
        <div class="topic-meta">${L.statusBadge(t.status)}${L.diffBadge(t.difficulty)}${L.priorityBadge(t.priority)}<span><i class="bi bi-clock"></i> ${L.num(t.hours)}h</span>
        <span title="Guided learning steps"><i class="bi bi-list-check"></i> ${st.done}/${st.total} steps</span>
        <span title="Component lab acceptance criteria"><i class="bi bi-boxes"></i> lab ${lb.done}/${lb.total}</span>
        ${t.targetDate ? `<span class="${over ? 'badge-lmt badge-overdue' : ''}"><i class="bi bi-calendar-event"></i> ${over ? 'Overdue · ' : ''}${L.fmt(t.targetDate)}</span>` : ''}
        ${t.status === 'Completed' && t.completionDate ? `<span class="text-success"><i class="bi bi-check2"></i> ${L.fmt(t.completionDate)}</span>` : ''}
        ${miss.length && t.status !== 'Completed' ? `<span class="text-accent" title="Prerequisites not completed: ${esc(miss.map(m => m.title).join(', '))}"><i class="bi bi-exclamation-triangle"></i> ${miss.length} prereq pending</span>` : ''}
        ${t.custom ? '<span class="badge-lmt st-hold">Custom</span>' : ''}</div></div>
      <div class="topic-progress">${L.progressBar(p, { cls: t.status === 'Completed' ? 'green' : '', label: 'Progress ' + t.title })}<div class="small text-muted-lmt mt-1 text-end">${Math.round(p)}%</div></div>
      <div class="topic-actions">
        ${t.status === 'Not Started' ? `<button class="btn-ghost" data-act="start" title="Mark In Progress" aria-label="Mark ${esc(t.title)} in progress"><i class="bi bi-play-circle"></i></button>` : ''}
        ${t.status !== 'Completed' ? `<button class="btn-ghost" data-act="complete" title="Mark Completed" aria-label="Mark ${esc(t.title)} completed"><i class="bi bi-check2-circle"></i></button>`
          : `<button class="btn-ghost" data-act="reopen" title="Reopen as In Progress" aria-label="Reopen ${esc(t.title)}"><i class="bi bi-arrow-counterclockwise"></i></button>`}
        <button class="btn-ghost" data-act="edit" title="Edit" aria-label="Edit ${esc(t.title)}"><i class="bi bi-pencil"></i></button>
        ${t.custom ? `<button class="btn-ghost danger" data-act="delete" title="Delete custom topic" aria-label="Delete ${esc(t.title)}"><i class="bi bi-trash"></i></button>`
          : `<span class="btn-ghost" title="Protected core topic — cannot be deleted" aria-label="Protected core topic"><i class="bi bi-lock"></i></span>`}
      </div></div>`;
  }

  function render() {
    fillCategorySelects();
    const f = filters(), ts = L.topicStats();
    const overdue = L.state.topics.filter(t => L.isOverdue(t.targetDate, t.status)).length;
    $('rmSummary').innerHTML = `${ts.total} topics · ${ts.completed} completed · ${ts.inProgress} in progress · ${overdue ? `<span class="text-danger">${overdue} overdue</span>` : '0 overdue'}`;
    const cats = L.sortedCategories().filter(c => !f.cat || c.id === f.cat);
    let html = '', nav = '';
    cats.forEach(c => {
      const all = L.state.topics.filter(t => t.categoryId === c.id);
      const list = sortList(all.filter(t => match(t, f)), f.sort);
      if (hasFilter(f) && !list.length) return;
      const s = L.statsFor(all);
      const open = expanded.has(c.id) || (hasFilter(f) && list.length > 0) || !!f.cat;
      html += `<section class="card-lmt cat-block ${open ? 'open' : ''}" id="sec-${esc(c.id)}" data-cat="${esc(c.id)}">
        <div class="cat-header">
          <button class="cat-toggle" data-act="toggle" aria-expanded="${open}" aria-controls="body-${esc(c.id)}"><i class="bi bi-chevron-right cat-chevron" aria-hidden="true"></i><span class="cat-icon"><i class="bi ${esc(c.icon || 'bi-folder')}"></i></span>
            <span class="min-w-0 flex-grow-1"><span class="d-block fw-bold text-truncate">${c.code ? esc(c.code) + '. ' : ''}${esc(c.name)}</span><span class="d-block small text-muted-lmt">${s.completed}/${s.total} completed · ${s.inProgress} active · ${s.totalHours}h · weighted ${Math.round(s.weightedPct)}%</span></span></button>
          <div class="d-none d-sm-block" style="width:140px">${L.progressBar(s.completionPct, { label: c.name + ' completion' })}<div class="small text-end text-muted-lmt mt-1">${Math.round(s.completionPct)}%</div></div>
          <div class="dropdown"><button class="btn-ghost" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Actions for ${esc(c.name)}"><i class="bi bi-three-dots-vertical"></i></button>
            <ul class="dropdown-menu dropdown-menu-end"><li><button class="dropdown-item" data-act="add-topic-in"><i class="bi bi-plus-lg me-2"></i>Add topic</button></li><li><button class="dropdown-item" data-act="edit-cat"><i class="bi bi-pencil me-2"></i>Edit category</button></li><li><button class="dropdown-item" data-act="select-cat"><i class="bi bi-check2-square me-2"></i>Select all topics</button></li><li><hr class="dropdown-divider"></li>${c.custom ? `<li><button class="dropdown-item text-danger" data-act="del-cat"><i class="bi bi-trash me-2"></i>Delete custom category</button></li>` : `<li><span class="dropdown-item-text small text-muted-lmt"><i class="bi bi-lock me-2"></i>Core category — protected</span></li>`}</ul></div>
        </div>
        <div class="cat-body" id="body-${esc(c.id)}">${c.description ? `<div class="px-3 py-2 small text-muted-lmt border-bottom" style="border-color:var(--lmt-border)!important">${esc(c.description)}</div>` : ''}
          ${list.length ? list.map(topicRow).join('') : L.emptyState('bi-inbox', 'No topics in this category yet', '', '<button class="btn btn-sm btn-primary" data-act="add-topic-in">Add topic</button>')}</div></section>`;
      nav += `<a href="#sec-${esc(c.id)}" data-nav="${esc(c.id)}"><span class="text-truncate"><i class="bi ${esc(c.icon || 'bi-folder')} me-1"></i>${esc(c.name)}</span><span class="badge-lmt ${s.total && s.completed === s.total ? 'st-done' : 'st-ns'}">${s.completed}/${s.total}</span></a>`;
    });
    $('roadmapList').innerHTML = html || L.emptyState('bi-search', 'No topics match your filters', 'Try a different search term or reset filters.', '<button class="btn btn-sm btn-outline-lmt" data-act="reset">Reset filters</button>');
    $('catNav').innerHTML = '<div class="kpi-label px-2 py-1">Categories</div>' + (nav || '<div class="small text-muted-lmt px-2">None</div>');
    updateBulk();
    if (detailId && $('topicDetails').classList.contains('show')) renderDetails(detailId);
  }

  /* ---------- Status logic ---------- */
  function applyStatus(t, status) {
    if (t.status === status) return;
    const td = L.today();
    t.status = status;
    if (status === 'Completed') { t.progress = 100; t.completionDate = t.completionDate || td; if (!t.startDate) t.startDate = td; }
    else if (status === 'In Progress') { t.completionDate = ''; if (!t.startDate) t.startDate = td; if (L.num(t.progress) >= 100) t.progress = 90; }
    else { t.completionDate = ''; t.progress = 0; }
    t.updatedAt = new Date().toISOString();
  }
  async function confirmPrereqs(t) {
    const miss = L.prereqsMissing(t);
    if (!miss.length) return true;
    return L.confirm(`These prerequisites are not completed yet:\n• ${miss.map(m => m.id + ' — ' + m.title).join('\n• ')}\n\nMark "${t.title}" as completed anyway? Prerequisites will not be changed.`, { title: 'Prerequisites incomplete', ok: 'Complete anyway' });
  }
  async function setStatus(t, status) {
    if (status === 'Completed' && !(await confirmPrereqs(t))) return;
    if (status === 'In Progress' && t.status === 'Not Started') { const miss = L.prereqsMissing(t); if (miss.length) L.toast(`Heads up: ${miss.length} prerequisite(s) not completed yet.`, 'warning'); }
    applyStatus(t, status);
    L.log('topic', `${status === 'Completed' ? 'Completed' : status === 'In Progress' ? 'Started' : 'Reset'} topic ${t.id}: ${t.title}`, t.id);
    L.save();
    L.toast(status === 'Completed' ? `"${t.title}" marked as completed 🎉` : `"${t.title}" is now ${status}.`);
  }

  /* ---------- Details panel ---------- */
  function renderDetails(id) {
    const t = L.topic(id); if (!t) { details.hide(); return; }
    detailId = id;
    const cat = L.category(t.categoryId), over = L.isOverdue(t.targetDate, t.status), miss = L.prereqsMissing(t);
    const requiredBy = L.state.topics.filter(x => (x.prerequisites || []).includes(t.id));
    const notes = L.state.notes.filter(n => n.topicId === t.id);
    const projs = L.state.projects.filter(p => (p.topics || []).includes(t.id));
    const p = L.topicProgress(t), ss = L.stepStats(t), ls = L.labStats(t);
    $('tdTitle').textContent = `${t.id} · ${t.title}`;
    $('tdBody').innerHTML = `
      <div class="d-flex flex-wrap gap-1 mb-3">${L.statusBadge(t.status)}${L.diffBadge(t.difficulty)}${L.priorityBadge(t.priority)}<span class="badge-lmt st-ns"><i class="bi ${esc(cat ? cat.icon : 'bi-folder')}"></i> ${esc(cat ? cat.name : 'Uncategorised')}</span>${over ? '<span class="badge-lmt badge-overdue"><i class="bi bi-alarm"></i> Overdue</span>' : ''}</div>
      ${miss.length && t.status !== 'Completed' ? `<div class="warning-box mb-3"><i class="bi bi-exclamation-triangle-fill text-accent"></i> <strong>${miss.length} prerequisite(s) not completed.</strong> Consider finishing them first.</div>` : ''}
      <div class="detail-section"><h3>Progress</h3><div class="d-flex align-items-center gap-3"><div class="flex-grow-1">${L.progressBar(p, { height: 'thick', cls: t.status === 'Completed' ? 'green' : '', label: 'Topic progress' })}</div><strong>${Math.round(p)}%</strong></div>
        ${t.status !== 'Completed' ? `<label class="form-label small mt-2" for="tdProgress">Adjust progress manually</label><input type="range" class="form-range" id="tdProgress" min="0" max="100" step="5" value="${L.num(t.progress)}">` : ''}</div>
      <div class="detail-section">
        <div class="d-flex justify-content-between align-items-center gap-2"><h3 class="mb-0">Guided steps (${ss.done}/${ss.total})</h3><button class="btn btn-sm btn-outline-lmt" data-dact="sync" title="Use checked steps to set progress"><i class="bi bi-arrow-repeat"></i> Sync progress</button></div>
        <div class="my-2">${L.progressBar(ss.pct, { label: 'Guided steps completed', cls: ss.pct === 100 ? 'green' : '' })}</div>
        <div class="small text-muted-lmt mb-2">Work through the steps in order. Ticking them never marks the topic completed automatically — you still confirm that explicitly.</div>
        ${(t.steps || []).map((s, i) => `<div class="check-item ${s.done ? 'done' : ''}"><input class="form-check-input m-0" type="checkbox" id="step-${esc(s.id)}" data-step="${esc(s.id)}" ${s.done ? 'checked' : ''}><label class="small flex-grow-1" for="step-${esc(s.id)}"><strong>${i + 1}. ${esc(s.title)}</strong><span class="d-block text-muted-lmt">${esc(s.detail)}</span></label></div>`).join('')}
      </div>
      <div class="detail-section">
        <h3>Component lab (${ls.done}/${ls.total} acceptance criteria)</h3>
        ${L.progressBar(ls.pct, { cls: ls.pct === 100 ? 'green' : 'accent', label: 'Component lab criteria' })}
        <div class="info-box small mt-2"><strong><i class="bi bi-boxes"></i> ${esc(t.lab.title)}</strong><p class="mb-2 mt-1">${esc(t.lab.brief)}</p><div><span class="kpi-label">Deliverable</span><div>${esc(t.lab.deliverable)}</div></div></div>
        ${(t.lab.criteria || []).map(c => `<div class="check-item ${c.done ? 'done' : ''}"><input class="form-check-input m-0" type="checkbox" id="crit-${esc(c.id)}" data-crit="${esc(c.id)}" ${c.done ? 'checked' : ''}><label class="small" for="crit-${esc(c.id)}">${esc(c.text)}</label></div>`).join('')}
        <div class="small text-muted-lmt mt-2"><i class="bi bi-link-45deg"></i> When the lab is finished, save the repository link in <strong>Evidence</strong> before marking the topic complete.</div>
      </div>
      <div class="detail-section"><div class="row g-2 small">
        <div class="col-6 col-sm-3"><div class="text-muted-lmt">Est. hours</div><strong>${L.num(t.hours)}h</strong></div>
        <div class="col-6 col-sm-3"><div class="text-muted-lmt">Start</div><strong>${L.fmt(t.startDate)}</strong></div>
        <div class="col-6 col-sm-3"><div class="text-muted-lmt">Target</div><strong class="${over ? 'text-danger' : ''}">${L.fmt(t.targetDate)}</strong></div>
        <div class="col-6 col-sm-3"><div class="text-muted-lmt">Completed</div><strong>${L.fmt(t.completionDate)}</strong></div></div></div>
      <div class="detail-section"><h3>Description</h3><p class="small mb-0">${esc(t.description || 'No description.')}</p></div>
      <div class="detail-section"><h3>Prerequisites</h3>${(t.prerequisites || []).length ? `<div class="d-flex flex-column gap-1">${t.prerequisites.map(pid => { const x = L.topic(pid); return x ? `<button class="btn btn-sm btn-outline-lmt text-start d-flex align-items-center gap-2" data-open="${esc(x.id)}"><i class="bi ${x.status === 'Completed' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle text-accent'}"></i><span class="topic-id">${esc(x.id)}</span><span class="text-truncate">${esc(x.title)}</span><span class="ms-auto">${L.statusBadge(x.status)}</span></button>` : `<span class="small text-muted-lmt">${esc(pid)} (deleted)</span>`; }).join('')}</div>` : '<p class="small text-muted-lmt mb-0">No prerequisites.</p>'}</div>
      ${requiredBy.length ? `<div class="detail-section"><h3>Unlocks</h3><div class="d-flex flex-wrap gap-1">${requiredBy.map(x => `<button class="chip" data-open="${esc(x.id)}">${esc(x.id)} · ${esc(x.title)}</button>`).join('')}</div></div>` : ''}
      <div class="detail-section"><h3>Practice task</h3><div class="info-box small">${esc(t.practiceTask || 'No practice task yet.')}</div></div>
      <div class="detail-section"><h3>Resources</h3>${t.resources.length ? `<ul class="list-unstyled mb-0 small">${t.resources.map(r => `<li class="mb-1">${L.isUrl(r) ? `<a href="${esc(r)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-link-45deg"></i> ${esc(r)}</a>` : `<span class="link-invalid"><i class="bi bi-exclamation-triangle"></i> Invalid: ${esc(r)}</span>`}</li>`).join('')}</ul>` : '<p class="small text-muted-lmt mb-0">No resources saved.</p>'}</div>
      <div class="detail-section"><h3>Evidence & links</h3><div class="d-flex flex-column gap-1">${L.link(t.githubUrl, 'GitHub repository', 'bi-github')}${L.link(t.demoUrl, 'Live demo', 'bi-globe')}${L.link(t.evidenceUrl, 'Project / evidence', 'bi-patch-check')}</div></div>
      <div class="detail-section"><h3>Personal notes</h3>${t.notes ? `<div class="note-body">${L.md(t.notes)}</div>` : '<p class="small text-muted-lmt mb-0">No notes yet.</p>'}</div>
      ${projs.length ? `<div class="detail-section"><h3>Used in projects</h3><div class="d-flex flex-wrap gap-1">${projs.map(x => `<a class="chip" href="projects.html?project=${encodeURIComponent(x.id)}"><i class="bi bi-kanban"></i> ${esc(x.name)}</a>`).join('')}</div></div>` : ''}
      <div class="detail-section"><h3>Linked notes</h3><a class="small" href="notes.html?topic=${encodeURIComponent(t.id)}">${notes.length} note(s) — open notes <i class="bi bi-arrow-right"></i></a></div>
      <div class="d-flex flex-wrap gap-2 pt-2 border-top" style="border-color:var(--lmt-border)!important">
        ${t.status === 'Not Started' ? '<button class="btn btn-sm btn-outline-lmt" data-dact="start"><i class="bi bi-play-circle"></i> Start</button>' : ''}
        ${t.status !== 'Completed' ? '<button class="btn btn-sm btn-primary" data-dact="complete"><i class="bi bi-check2-circle"></i> Mark completed</button>' : '<button class="btn btn-sm btn-outline-lmt" data-dact="reopen"><i class="bi bi-arrow-counterclockwise"></i> Reopen</button>'}
        <button class="btn btn-sm btn-outline-lmt" data-dact="edit"><i class="bi bi-pencil"></i> Edit</button></div>`;
  }
  function openDetails(id) { renderDetails(id); details.show(); }
  $('tdBody').addEventListener('click', e => {
    const o = e.target.closest('[data-open]'); if (o) { renderDetails(o.dataset.open); return; }
    const b = e.target.closest('[data-dact]'); if (!b) return;
    const t = L.topic(detailId); if (!t) return;
    const a = b.dataset.dact;
    if (a === 'start') setStatus(t, 'In Progress');
    else if (a === 'complete') setStatus(t, 'Completed');
    else if (a === 'reopen') setStatus(t, 'In Progress');
    else if (a === 'edit') { details.hide(); openForm(t); }
    else if (a === 'sync') {
      const pct = Math.round(L.stepStats(t).pct);
      t.progress = pct;
      t.updatedAt = new Date().toISOString();
      if (t.status === 'Not Started' && pct > 0) { t.status = 'In Progress'; if (!t.startDate) t.startDate = L.today(); }
      L.log('topic', `Synced ${t.id} progress from guided steps (${pct}%)`, t.id);
      L.save(); L.toast(`Progress synced from steps: ${pct}%.`, 'info');
    }
  });
  $('tdBody').addEventListener('change', e => {
    const t = L.topic(detailId); if (!t) return;
    if (e.target.dataset.step) {
      const s = (t.steps || []).find(x => x.id === e.target.dataset.step); if (!s) return;
      s.done = e.target.checked; s.doneAt = s.done ? new Date().toISOString() : null;
      t.updatedAt = new Date().toISOString();
      const st = L.stepStats(t);
      L.log('topic', `${s.done ? 'Completed' : 'Unchecked'} guided step "${s.title}" on ${t.id}`, t.id);
      L.save();
      if (st.pct === 100 && t.status !== 'Completed') L.toast('All guided steps are done. You can now mark the topic complete explicitly.', 'info');
      return;
    }
    if (e.target.dataset.crit) {
      const c = (t.lab.criteria || []).find(x => x.id === e.target.dataset.crit); if (!c) return;
      c.done = e.target.checked;
      t.updatedAt = new Date().toISOString();
      L.log('topic', `${c.done ? 'Met' : 'Unmet'} component-lab criterion on ${t.id}`, t.id);
      L.save();
      if (L.labStats(t).pct === 100) L.toast('Component lab complete! Attach the repository as evidence, then finish the remaining steps.', 'success');
      return;
    }
    if (e.target.id !== 'tdProgress') return;
    t.progress = L.clamp(L.num(e.target.value), 0, 100);
    if (t.status === 'Not Started' && t.progress > 0) { t.status = 'In Progress'; if (!t.startDate) t.startDate = L.today(); }
    t.updatedAt = new Date().toISOString();
    L.log('topic', `Updated progress of ${t.id} to ${t.progress}%`, t.id);
    L.save(); L.toast(`Progress set to ${t.progress}%.`);
  });

  /* ---------- Topic form ---------- */
  function openForm(t = null, catId = null) {
    const f = $('topicForm'); f.classList.remove('was-validated'); f.reset();
    f.querySelectorAll('[data-url]').forEach(i => i.setCustomValidity(''));
    fillCategorySelects();
    $('tmTitle').textContent = t ? `Edit topic ${t.id}` : 'Add custom topic';
    $('tId').value = t ? t.id : '';
    $('tTitle').value = t ? t.title : '';
    $('tCategory').value = t ? t.categoryId : (catId || $('fCategory').value || (L.sortedCategories()[0] || {}).id || '');
    $('tDifficulty').value = t ? t.difficulty : 'Intermediate';
    $('tPriority').value = t ? t.priority : 'Medium';
    $('tHours').value = t ? L.num(t.hours) : 6;
    $('tStatus').value = t ? t.status : 'Not Started';
    $('tProgress').value = t ? L.topicProgress(t) : 0; $('tProgressVal').textContent = $('tProgress').value + '%';
    $('tStart').value = t ? t.startDate || '' : ''; $('tTarget').value = t ? t.targetDate || '' : ''; $('tCompletion').value = t ? t.completionDate || '' : '';
    $('tDescription').value = t ? t.description || '' : '';
    $('tPrereqs').innerHTML = L.topicOptions(t ? t.prerequisites : []);
    if (t) { const self = $('tPrereqs').querySelector(`option[value="${CSS.escape(t.id)}"]`); if (self) self.disabled = true; }
    $('tPractice').value = t ? t.practiceTask || '' : '';
    $('tResources').value = t ? (t.resources || []).join('\n') : '';
    $('tGithub').value = t ? t.githubUrl || '' : ''; $('tDemo').value = t ? t.demoUrl || '' : ''; $('tEvidence').value = t ? t.evidenceUrl || '' : '';
    $('tNotes').value = t ? t.notes || '' : '';
    const miss = t ? L.prereqsMissing(t) : [];
    $('tPrereqWarn').innerHTML = miss.length && t.status !== 'Completed' ? `<div class="warning-box mb-3"><i class="bi bi-exclamation-triangle-fill text-accent"></i> Prerequisites not completed: ${miss.map(m => esc(m.title)).join(', ')}</div>` : '';
    topicModal.show();
  }
  $('tProgress').addEventListener('input', e => { $('tProgressVal').textContent = e.target.value + '%'; });
  function nextTopicId(catId) {
    const c = L.category(catId); const code = (c && c.code ? c.code : 'T').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'T';
    let n = L.state.topics.filter(t => t.id.startsWith(code + '-')).length + 1, id;
    do { id = `${code}-${String(n).padStart(2, '0')}`; n++; } while (L.topic(id));
    return id;
  }
  $('topicForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    L.validateUrlInputs(f);
    const start = $('tStart').value, target = $('tTarget').value;
    $('tTarget').setCustomValidity(start && target && target < start ? 'Target date must be after start date' : '');
    if (!$('tTitle').value.trim()) $('tTitle').value = '';
    f.classList.add('was-validated');
    if (!f.checkValidity()) { L.toast('Please fix the highlighted fields.', 'danger'); f.querySelector(':invalid')?.focus(); return; }
    const id = $('tId').value;
    const isNew = !id;
    const t = isNew ? { id: nextTopicId($('tCategory').value), status: 'Not Started', progress: 0, completionDate: '', custom: true, steps: [], lab: null, createdAt: new Date().toISOString() } : L.topic(id);
    if (!t) { L.toast('Topic no longer exists.', 'danger'); return; }
    const prevStatus = t.status;
    const newStatus = $('tStatus').value;
    const prereqs = [...$('tPrereqs').selectedOptions].map(o => o.value).filter(v => v !== t.id);
    Object.assign(t, {
      title: $('tTitle').value.trim(), categoryId: $('tCategory').value, difficulty: $('tDifficulty').value, priority: $('tPriority').value,
      hours: L.clamp(L.num($('tHours').value), 0, 1000), startDate: start, targetDate: target, description: $('tDescription').value.trim(),
      prerequisites: prereqs, practiceTask: $('tPractice').value.trim(),
      resources: $('tResources').value.split('\n').map(x => x.trim()).filter(Boolean),
      githubUrl: $('tGithub').value.trim(), demoUrl: $('tDemo').value.trim(), evidenceUrl: $('tEvidence').value.trim(), notes: $('tNotes').value
    });
    if (newStatus === 'Completed' && prevStatus !== 'Completed' && !(await confirmPrereqs(t))) return;
    applyStatus(t, newStatus);
    if (t.status !== 'Completed') {
      t.progress = L.clamp(L.num($('tProgress').value), 0, 100);
      if (t.status === 'Not Started' && t.progress > 0) { t.status = 'In Progress'; if (!t.startDate) t.startDate = L.today(); }
    } else if ($('tCompletion').value) t.completionDate = $('tCompletion').value;
    t.updatedAt = new Date().toISOString();
    if (isNew) { L.ensureTopicMeta(t); L.state.topics.push(t); expanded.add(t.categoryId); }
    L.log('topic', `${isNew ? 'Added custom topic' : 'Updated topic'} ${t.id}: ${t.title}`, t.id);
    L.save(); topicModal.hide();
    L.toast(isNew ? `Topic "${t.title}" added.` : 'Topic saved.');
  });

  async function deleteTopic(t) {
    if (!t.custom) { L.toast('Core roadmap topics are protected — the curriculum cannot be deleted so nothing goes missing. You can edit it or add your own topics instead.', 'warning'); return; }
    if (!(await L.confirm(`Delete custom topic "${t.title}" (${t.id})? This also removes it from prerequisites, projects and linked notes.`, { title: 'Delete custom topic', ok: 'Delete', danger: true }))) return;
    removeTopics([t.id]);
    L.log('topic', `Deleted topic ${t.id}: ${t.title}`, t.id);
    L.save(); L.toast('Topic deleted.');
  }
  function removeTopics(ids) {
    const set = new Set(ids.map(L.topic).filter(t => t && t.custom).map(t => t.id)), s = L.state;
    s.topics = s.topics.filter(t => !set.has(t.id));
    s.topics.forEach(t => { t.prerequisites = t.prerequisites.filter(p => !set.has(p)); });
    s.projects.forEach(p => { p.topics = (p.topics || []).filter(x => !set.has(x)); });
    s.notes.forEach(n => { if (set.has(n.topicId)) n.topicId = ''; });
    s.routineTemplate.forEach(r => { if (set.has(r.topicId)) r.topicId = ''; });
    Object.values(s.days).forEach(d => { d.tasks.forEach(x => { if (set.has(x.topicId)) x.topicId = ''; }); d.topics = (d.topics || []).filter(x => !set.has(x)); });
    ids.forEach(i => selected.delete(i));
    if (set.has(detailId)) { details.hide(); detailId = null; }
  }

  /* ---------- Categories ---------- */
  function openCatForm(c = null) {
    const f = $('categoryForm'); f.classList.remove('was-validated'); f.reset();
    $('cmTitle').textContent = c ? 'Edit category' : 'Add custom category';
    $('cId').value = c ? c.id : ''; $('cName').value = c ? c.name : ''; $('cCode').value = c ? c.code || '' : '';
    $('cIcon').value = c ? c.icon || '' : 'bi-folder'; $('cDesc').value = c ? c.description || '' : '';
    catModal.show();
  }
  $('categoryForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target; $('cName').value = $('cName').value.trim();
    f.classList.add('was-validated');
    if (!f.checkValidity()) return;
    const id = $('cId').value;
    const icon = ($('cIcon').value.trim() || 'bi-folder').replace(/[^a-z0-9-]/gi, '');
    const data = { name: $('cName').value, code: $('cCode').value.trim().toUpperCase(), icon: icon.startsWith('bi-') ? icon : 'bi-' + icon, description: $('cDesc').value.trim() };
    if (id) { Object.assign(L.category(id), data); L.log('topic', `Updated category ${data.name}`); }
    else {
      const c = Object.assign({ id: L.uid('cat'), order: L.state.categories.length, custom: true }, data);
      L.state.categories.push(c); expanded.add(c.id); L.log('topic', `Added custom category ${data.name}`);
    }
    L.save(); catModal.hide(); L.toast('Category saved.');
  });
  async function deleteCategory(c) {
    if (!c.custom) { L.toast('Core categories are protected so the full Laravel curriculum is never lost. You can rename, reorder or add topics to it instead.', 'warning'); return; }
    const ids = L.state.topics.filter(t => t.categoryId === c.id).map(t => t.id);
    const ok = await L.confirm(`Delete category "${c.name}"${ids.length ? ` and its ${ids.length} topic(s)` : ''}? This cannot be undone (export a backup first if unsure).`, { title: 'Delete category', ok: 'Delete', danger: true, requireText: ids.length ? 'DELETE' : null });
    if (!ok) return;
    removeTopics(ids);
    L.state.categories = L.state.categories.filter(x => x.id !== c.id);
    L.log('topic', `Deleted category ${c.name}`);
    L.save(); L.toast('Category deleted.');
  }

  /* ---------- Bulk ---------- */
  function updateBulk() {
    [...selected].forEach(id => { if (!L.topic(id)) selected.delete(id); });
    $('bulkBar').classList.toggle('d-none', selected.size === 0);
    $('bulkCount').textContent = `${selected.size} selected`;
  }
  $('bulkApply').addEventListener('click', async () => {
    const status = $('bulkStatus').value;
    if (!status) { L.toast('Choose a status to apply.', 'warning'); $('bulkStatus').focus(); return; }
    const list = [...selected].map(L.topic).filter(Boolean);
    const pending = status === 'Completed' ? list.filter(t => L.prereqsMissing(t).length).length : 0;
    const ok = await L.confirm(`Change ${list.length} topic(s) to "${status}"?${pending ? `\n\n${pending} of them have incomplete prerequisites. Prerequisites will NOT be changed.` : ''}${status === 'Not Started' ? '\n\nProgress for these topics will be reset to 0%.' : ''}`, { title: 'Bulk status change', ok: 'Apply' });
    if (!ok) return;
    list.forEach(t => applyStatus(t, status));
    L.log('topic', `Bulk-changed ${list.length} topic(s) to ${status}`);
    selected.clear(); $('bulkStatus').value = '';
    L.save(); L.toast(`${list.length} topic(s) updated.`);
  });
  $('bulkClear').addEventListener('click', () => { selected.clear(); render(); });
  $('bulkSelectVisible').addEventListener('click', () => { document.querySelectorAll('.cat-block.open .topic-row').forEach(r => selected.add(r.dataset.id)); render(); });

  /* ---------- Events ---------- */
  $('roadmapList').addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, row = el.closest('[data-id]'), sec = el.closest('[data-cat]');
    const t = row ? L.topic(row.dataset.id) : null, c = sec ? L.category(sec.dataset.cat) : null;
    switch (act) {
      case 'toggle': { const open = !sec.classList.contains('open'); sec.classList.toggle('open', open); el.setAttribute('aria-expanded', open); open ? expanded.add(c.id) : expanded.delete(c.id); break; }
      case 'details': openDetails(t.id); break;
      case 'start': setStatus(t, 'In Progress'); break;
      case 'complete': setStatus(t, 'Completed'); break;
      case 'reopen': setStatus(t, 'In Progress'); break;
      case 'edit': openForm(t); break;
      case 'delete': deleteTopic(t); break;
      case 'add-topic-in': openForm(null, c && c.id); break;
      case 'edit-cat': openCatForm(c); break;
      case 'del-cat': deleteCategory(c); break;
      case 'select-cat': L.state.topics.filter(x => x.categoryId === c.id).forEach(x => selected.add(x.id)); expanded.add(c.id); render(); break;
      case 'reset': resetFilters(); break;
    }
  });
  $('roadmapList').addEventListener('change', e => {
    if (!e.target.classList.contains('bulk-check')) return;
    const id = e.target.closest('[data-id]').dataset.id;
    e.target.checked ? selected.add(id) : selected.delete(id);
    updateBulk();
  });
  $('catNav').addEventListener('click', e => {
    const a = e.target.closest('[data-nav]'); if (!a) return;
    expanded.add(a.dataset.nav);
    const sec = document.getElementById('sec-' + a.dataset.nav);
    if (sec) { sec.classList.add('open'); sec.querySelector('.cat-toggle').setAttribute('aria-expanded', 'true'); }
  });
  function resetFilters() { ['fSearch', 'fStatus', 'fDifficulty', 'fCategory', 'fPriority'].forEach(i => { $(i).value = ''; }); $('fSort').value = 'default'; render(); }
  $('fSearch').addEventListener('input', L.debounce(render, 200));
  ['fStatus', 'fDifficulty', 'fCategory', 'fPriority', 'fSort'].forEach(i => $(i).addEventListener('change', render));
  $('btnReset').addEventListener('click', resetFilters);
  $('btnExpandAll').addEventListener('click', () => { L.state.categories.forEach(c => expanded.add(c.id)); render(); });
  $('btnCollapseAll').addEventListener('click', () => { expanded.clear(); document.querySelectorAll('.cat-block').forEach(s => { s.classList.remove('open'); s.querySelector('.cat-toggle').setAttribute('aria-expanded', 'false'); }); });
  $('btnAddTopic').addEventListener('click', () => openForm());
  $('btnAddCategory').addEventListener('click', () => openCatForm());
  $('topicDetails').addEventListener('hidden.bs.offcanvas', () => { detailId = null; });

  /* ---------- Init ---------- */
  const firstActive = L.state.topics.find(t => t.status === 'In Progress');
  const firstCat = L.sortedCategories()[0];
  if (firstActive) expanded.add(firstActive.categoryId); else if (firstCat) expanded.add(firstCat.id);
  const qp = L.param('topic'), qs = L.param('status');
  if (qs) $('fStatus').value = qs;
  const qt = qp ? L.topic(qp) : null;
  if (qt) expanded.add(qt.categoryId);
  L.onChange(render);
  render();
  if (qt) { setTimeout(() => { const row = document.querySelector(`.topic-row[data-id="${CSS.escape(qt.id)}"]`); row && row.scrollIntoView({ block: 'center' }); openDetails(qt.id); }, 150); }
  else if (qp) L.toast(`Topic "${qp}" was not found.`, 'warning');
})();
