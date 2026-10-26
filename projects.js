'use strict';
/* Projects page — CRUD, checklists with subtasks, explicit completion, history */
(() => {
  const L = LMT, $ = id => document.getElementById(id), esc = L.esc;
  const formModal = new bootstrap.Modal($('projectModal'));
  const detailModal = new bootstrap.Modal($('detailModal'));
  let openId = null, activeTab = 'overview';
  const LISTS = { features: 'Features', testing: 'Testing checklist', deployment: 'Deployment checklist' };
  const now = () => new Date().toISOString();
  function touch(p, event) { p.updatedAt = now(); if (event) { p.history.push({ date: now(), event }); L.log('project', `${p.name}: ${event}`, p.id); } }

  /* ---------- List ---------- */
  function filtered() {
    const q = $('pSearch').value.trim().toLowerCase(), st = $('pStatus').value, pr = $('pPriority').value, so = $('pSort').value;
    let list = L.state.projects.filter(p => (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)) && (!st || p.status === st) && (!pr || p.priority === pr));
    if (so === 'ladder') { const rank = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 }; list.sort((a, b) => ((rank[a.difficulty] || 9) - (rank[b.difficulty] || 9)) || (L.num(a.estimatedHours) - L.num(b.estimatedHours)) || a.name.localeCompare(b.name)); }
    else if (so === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (so === 'progress') list.sort((a, b) => L.projectProgress(b) - L.projectProgress(a));
    else if (so === 'target') list.sort((a, b) => (a.targetDate || '9999').localeCompare(b.targetDate || '9999'));
    else if (so === 'priority') list.sort((a, b) => (L.PRI[b.priority] || 0) - (L.PRI[a.priority] || 0));
    return list;
  }
  function cover(p) {
    return `<div class="project-cover">${L.isUrl(p.imageUrl) ? `<img src="${esc(p.imageUrl)}" alt="Screenshot of ${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<i class="bi bi-kanban" aria-hidden="true"></i>${L.statusBadge(p.status)}</div>`;
  }
  function render() {
    const all = L.state.projects, list = filtered();
    const done = all.filter(p => p.status === 'Completed').length;
    $('projSummary').textContent = `${all.length} projects · ${done} completed · ${all.filter(p => p.status === 'In Progress').length} in progress`;
    if (!list.length) $('projectGrid').innerHTML = `<div class="card-lmt">${L.emptyState('bi-kanban', all.length ? 'No projects match your filters' : 'No projects yet', all.length ? 'Adjust the search or filters.' : 'Create your first portfolio project.', '<button class="btn btn-sm btn-primary" data-act="new">New project</button>')}</div>`;
    else if ($('pView').value === 'table') {
      $('projectGrid').innerHTML = `<div class="card-lmt"><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th scope="col">Project</th><th scope="col">Status</th><th scope="col">Priority</th><th scope="col">Progress</th><th scope="col">Target</th><th scope="col">Hours</th><th scope="col" class="text-end">Actions</th></tr></thead><tbody>
        ${list.map(p => { const pr = L.projectProgress(p), over = L.isOverdue(p.targetDate, p.status); return `<tr data-id="${esc(p.id)}"><td><button class="topic-title" data-act="open">${esc(p.name)}</button><div class="small text-muted-lmt">${esc(p.difficulty)}</div></td><td>${L.statusBadge(p.status)}</td><td>${L.priorityBadge(p.priority)}</td><td style="min-width:140px">${L.progressBar(pr, { label: 'Progress' })}<div class="small text-muted-lmt">${Math.round(pr)}%${p.progressMode === 'manual' ? ' (manual)' : ''}</div></td><td class="${over ? 'text-danger' : ''}">${L.fmt(p.targetDate)}</td><td>${L.num(p.actualHours)}/${L.num(p.estimatedHours)}h</td>
        <td class="text-end text-nowrap"><button class="btn-ghost" data-act="edit" aria-label="Edit ${esc(p.name)}"><i class="bi bi-pencil"></i></button><button class="btn-ghost danger" data-act="delete" aria-label="Delete ${esc(p.name)}"><i class="bi bi-trash"></i></button></td></tr>`; }).join('')}</tbody></table></div></div>`;
    } else {
      $('projectGrid').innerHTML = `<div class="row g-3">${list.map(p => {
        const pr = L.projectProgress(p), items = L.projectItems(p), over = L.isOverdue(p.targetDate, p.status);
        return `<div class="col-md-6 col-xxl-4"><article class="card-lmt project-card fade-in" data-id="${esc(p.id)}">${cover(p)}
          <div class="card-pad d-flex flex-column flex-grow-1">
            <div class="d-flex flex-wrap gap-1 mb-2">${L.diffBadge(p.difficulty)}${L.priorityBadge(p.priority)}${over ? '<span class="badge-lmt badge-overdue">Overdue</span>' : ''}</div>
            <h3 class="h6 fw-bold mb-1"><button class="topic-title" data-act="open">${esc(p.name)}</button></h3>
            <p class="small text-muted-lmt mb-3">${esc(p.description).slice(0, 140)}${p.description.length > 140 ? '…' : ''}</p>
            <div class="d-flex justify-content-between small mb-1"><span>Progress${p.progressMode === 'manual' ? ' (manual)' : ` · ${items.filter(i => i.done).length}/${items.length} items`}</span><strong>${Math.round(pr)}%</strong></div>
            ${L.progressBar(pr, { cls: p.status === 'Completed' ? 'green' : '', label: p.name + ' progress' })}
            <div class="row g-2 small mt-2 text-muted-lmt"><div class="col-6"><i class="bi bi-calendar-event"></i> ${L.fmt(p.targetDate)}</div><div class="col-6"><i class="bi bi-clock"></i> ${L.num(p.actualHours)}/${L.num(p.estimatedHours)}h</div></div>
            <div class="d-flex flex-wrap gap-3 mt-2">${L.link(p.githubUrl, 'GitHub', 'bi-github')}${L.link(p.demoUrl, 'Demo', 'bi-globe')}</div>
            ${pr >= 100 && p.status !== 'Completed' ? '<div class="info-box small mt-3"><i class="bi bi-flag"></i> Progress reached 100%. Confirm completion when you are satisfied.</div>' : ''}
            <div class="d-flex gap-2 mt-auto pt-3">
              <button class="btn btn-sm btn-primary flex-grow-1" data-act="open"><i class="bi bi-list-check"></i> Open</button>
              ${p.status !== 'Completed' ? `<button class="btn btn-sm btn-outline-lmt" data-act="complete" title="Mark as completed" aria-label="Mark ${esc(p.name)} as completed"><i class="bi bi-trophy"></i></button>` : ''}
              <button class="btn btn-sm btn-outline-lmt" data-act="edit" aria-label="Edit ${esc(p.name)}"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-lmt" data-act="delete" aria-label="Delete ${esc(p.name)}"><i class="bi bi-trash"></i></button></div>
          </div></article></div>`;
      }).join('')}</div>`;
    }
    const h = L.state.projectHistory.slice().sort((a, b) => b.ts.localeCompare(a.ts));
    $('historyList').innerHTML = h.length ? h.map(x => `<div class="list-row"><i class="bi ${x.event === 'completed' ? 'bi-trophy-fill text-accent' : x.event === 'reopened' ? 'bi-arrow-counterclockwise text-primary-lmt' : 'bi-archive text-muted-lmt'}"></i><div class="flex-grow-1 small"><strong>${esc(x.name)}</strong> — ${esc(x.event)}${x.completionDate ? ` (completion date ${L.fmt(x.completionDate)})` : ''}${x.deleted ? ' <span class="badge-lmt st-ns">project deleted</span>' : ''}</div><span class="kpi-hint">${L.fmtTs(x.ts)}</span></div>`).join('')
      : L.emptyState('bi-trophy', 'No completed projects yet', 'Complete a project explicitly to record it here.');
    if (openId && $('detailModal').classList.contains('show')) renderDetail();
  }

  /* ---------- Completion ---------- */
  async function complete(p) {
    const pr = L.projectProgress(p);
    const ok = await L.confirm(`Mark "${p.name}" as completed?${pr < 100 ? `\n\nProgress is currently ${Math.round(pr)}%. You can still complete it if you consider it finished.` : ''}\n\nThe completion date will be set to today.`, { title: 'Confirm project completion', ok: 'Mark completed' });
    if (!ok) return;
    p.status = 'Completed'; p.completionDate = L.today();
    touch(p, 'Marked as completed');
    L.state.projectHistory.push({ id: L.uid('ph'), projectId: p.id, name: p.name, event: 'completed', completionDate: p.completionDate, ts: now() });
    L.save(); L.toast(`"${p.name}" completed! 🏆`);
  }
  async function reopen(p) {
    if (!(await L.confirm(`Reopen "${p.name}"? Its completion record stays in the history.`, { title: 'Reopen project', ok: 'Reopen' }))) return;
    p.status = 'In Progress'; p.completionDate = '';
    touch(p, 'Reopened');
    L.state.projectHistory.push({ id: L.uid('ph'), projectId: p.id, name: p.name, event: 'reopened', ts: now() });
    L.save(); L.toast('Project reopened.', 'info');
  }
  async function remove(p) {
    if (!(await L.confirm(`Delete project "${p.name}"? Checklists and notes for this project will be removed. Completion history is preserved.`, { title: 'Delete project', ok: 'Delete', danger: true }))) return;
    L.state.projects = L.state.projects.filter(x => x.id !== p.id);
    L.state.projectHistory.forEach(h => { if (h.projectId === p.id) h.deleted = true; });
    L.state.notes.forEach(n => { if (n.projectId === p.id) n.projectId = ''; });
    if (p.status === 'Completed') L.state.projectHistory.push({ id: L.uid('ph'), projectId: p.id, name: p.name, event: 'archived (deleted after completion)', completionDate: p.completionDate, ts: now(), deleted: true });
    L.log('project', `Deleted project ${p.name}`, p.id);
    if (openId === p.id) { detailModal.hide(); openId = null; }
    L.save(); L.toast('Project deleted.');
  }

  /* ---------- Form ---------- */
  function openForm(p = null) {
    const f = $('projectForm'); f.reset(); f.classList.remove('was-validated');
    f.querySelectorAll('[data-url]').forEach(i => i.setCustomValidity(''));
    $('pmTitle').textContent = p ? 'Edit project' : 'New project';
    $('pId').value = p ? p.id : '';
    $('pName').value = p ? p.name : ''; $('pDesc').value = p ? p.description : '';
    $('pDifficulty').value = p ? p.difficulty : 'Intermediate'; $('pPri').value = p ? p.priority : 'Medium';
    const stat = $('pStat'), compOpt = stat.querySelector('option[value="Completed"]'); if (compOpt) compOpt.remove();
    if (p && p.status === 'Completed') { stat.insertAdjacentHTML('beforeend', '<option value="Completed">Completed</option>'); stat.value = 'Completed'; stat.disabled = true; $('pStatHelp').textContent = 'Completed projects can be reopened from the project detail view.'; }
    else { stat.disabled = false; stat.value = p ? p.status : 'Planned'; $('pStatHelp').textContent = 'Use “Mark as completed” on the project to complete it explicitly.'; }
    $('pStart').value = p ? p.startDate : ''; $('pTarget').value = p ? p.targetDate : '';
    $('pEst').value = p ? L.num(p.estimatedHours) : 20; $('pAct').value = p ? L.num(p.actualHours) : 0;
    $('pGithub').value = p ? p.githubUrl : ''; $('pDemo').value = p ? p.demoUrl : ''; $('pDocs').value = p ? p.docsUrl : ''; $('pImage').value = p ? p.imageUrl : '';
    $('pTopics').innerHTML = L.topicOptions(p ? p.topics : []);
    $('pMode').value = p ? p.progressMode || 'auto' : 'auto'; $('pManual').value = p ? L.num(p.manualProgress) : 0; $('pManualVal').textContent = $('pManual').value + '%';
    $('pManual').disabled = $('pMode').value !== 'manual';
    $('pInitWrap').classList.toggle('d-none', !!p);
    $('pNotes').value = p ? p.notes : '';
    formModal.show();
  }
  $('pMode').addEventListener('change', e => { $('pManual').disabled = e.target.value !== 'manual'; });
  $('pManual').addEventListener('input', e => { $('pManualVal').textContent = e.target.value + '%'; });
  $('projectForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target; $('pName').value = $('pName').value.trim();
    L.validateUrlInputs(f);
    $('pTarget').setCustomValidity($('pStart').value && $('pTarget').value && $('pTarget').value < $('pStart').value ? 'Invalid' : '');
    f.classList.add('was-validated');
    if (!f.checkValidity()) { L.toast('Please fix the highlighted fields.', 'danger'); f.querySelector(':invalid')?.focus(); return; }
    const id = $('pId').value;
    const data = {
      name: $('pName').value, description: $('pDesc').value.trim(), difficulty: $('pDifficulty').value, priority: $('pPri').value,
      startDate: $('pStart').value, targetDate: $('pTarget').value, estimatedHours: Math.max(0, L.num($('pEst').value)), actualHours: Math.max(0, L.num($('pAct').value)),
      githubUrl: $('pGithub').value.trim(), demoUrl: $('pDemo').value.trim(), docsUrl: $('pDocs').value.trim(), imageUrl: $('pImage').value.trim(),
      topics: [...$('pTopics').selectedOptions].map(o => o.value), progressMode: $('pMode').value, manualProgress: L.clamp(L.num($('pManual').value), 0, 100), notes: $('pNotes').value
    };
    if (id) {
      const p = L.project(id); if (!p) return;
      if (p.status !== 'Completed') data.status = $('pStat').value;
      Object.assign(p, data); touch(p, 'Details updated');
    } else {
      let n = L.state.projects.length + 1, pid; do { pid = 'PRJ-' + String(n).padStart(2, '0'); n++; } while (L.project(pid));
      const p = Object.assign({ id: pid, status: $('pStat').value, completionDate: '', testing: [], deployment: [], history: [], createdAt: now() }, data);
      p.features = $('pInitFeatures').value.split('\n').map(s => s.trim()).filter(Boolean).map(t => ({ id: L.uid('ci'), text: t, done: false, subtasks: [] }));
      L.state.projects.push(p); touch(p, 'Project created');
    }
    L.save(); formModal.hide(); L.toast('Project saved.');
  });

  /* ---------- Detail ---------- */
  function checklist(p, key) {
    const list = p[key] || [];
    const item = (it, parent) => `<div class="check-item ${it.done ? 'done' : ''}" data-list="${key}" data-item="${esc(it.id)}" ${parent ? `data-parent="${esc(parent)}"` : ''}>
      <input class="form-check-input m-0" type="checkbox" id="ci-${esc(it.id)}" data-act="toggle" ${it.done ? 'checked' : ''} ${!parent && it.subtasks && it.subtasks.length ? 'disabled title="Completed automatically when all subtasks are done"' : ''}>
      <label class="flex-grow-1 small" for="ci-${esc(it.id)}">${esc(it.text)}${!parent && it.subtasks && it.subtasks.length ? ` <span class="text-muted-lmt">(${it.subtasks.filter(s => s.done).length}/${it.subtasks.length})</span>` : ''}</label>
      ${key === 'features' && !parent ? `<button class="btn-ghost" data-act="add-sub" title="Add subtask" aria-label="Add subtask to ${esc(it.text)}"><i class="bi bi-node-plus"></i></button>` : ''}
      <button class="btn-ghost" data-act="rename" aria-label="Rename ${esc(it.text)}"><i class="bi bi-pencil"></i></button>
      <button class="btn-ghost danger" data-act="remove" aria-label="Remove ${esc(it.text)}"><i class="bi bi-x-lg"></i></button></div>
      ${!parent && it.subtasks && it.subtasks.length ? `<div class="subtasks">${it.subtasks.map(s => item(s, it.id)).join('')}</div>` : ''}`;
    return `${list.length ? list.map(i => item(i, null)).join('') : `<p class="small text-muted-lmt">No items yet.</p>`}
      <form class="input-group input-group-sm mt-2" data-add="${key}"><label class="visually-hidden" for="add-${key}">New item</label><input class="form-control" id="add-${key}" placeholder="Add ${key === 'features' ? 'feature' : 'item'}…" maxlength="160" required><button class="btn btn-primary" type="submit"><i class="bi bi-plus-lg"></i> Add</button></form>`;
  }
  function renderDetail() {
    const p = L.project(openId); if (!p) { detailModal.hide(); return; }
    const pr = L.projectProgress(p), items = L.projectItems(p);
    $('dmTitle').textContent = p.name;
    $('dmSub').innerHTML = `${esc(p.id)} · ${L.statusBadge(p.status)} ${L.priorityBadge(p.priority)} ${L.diffBadge(p.difficulty)}`;
    const tab = (k, label, count) => `<li class="nav-item" role="presentation"><button class="nav-link ${activeTab === k ? 'active' : ''}" data-tab="${k}" role="tab" aria-selected="${activeTab === k}">${label}${count !== undefined ? ` <span class="badge-lmt st-ns">${count}</span>` : ''}</button></li>`;
    const cnt = k => { const l = k === 'features' ? (p.features || []).flatMap(f => f.subtasks && f.subtasks.length ? f.subtasks : [f]) : p[k] || []; return `${l.filter(i => i.done).length}/${l.length}`; };
    let body = '';
    if (activeTab === 'overview') {
      body = `<div class="row g-3"><div class="col-lg-7">
          <p>${esc(p.description || 'No description.')}</p>
          <div class="detail-section"><h3>Links</h3><div class="d-flex flex-wrap gap-3">${L.link(p.githubUrl, 'GitHub repository', 'bi-github')}${L.link(p.demoUrl, 'Live demo', 'bi-globe')}${L.link(p.docsUrl, 'Documentation', 'bi-book')}${L.link(p.imageUrl, 'Screenshot', 'bi-image')}</div></div>
          <div class="detail-section"><h3>Associated roadmap topics</h3><div class="d-flex flex-wrap gap-1">${p.topics.length ? p.topics.map(id => { const t = L.topic(id); return t ? `<a class="chip" href="roadmap.html?topic=${encodeURIComponent(id)}"><i class="bi ${t.status === 'Completed' ? 'bi-check-circle-fill text-success' : 'bi-circle'}"></i> ${esc(id)} · ${esc(t.title)}</a>` : ''; }).join('') : '<span class="small text-muted-lmt">None linked.</span>'}</div></div>
          <div class="detail-section"><h3>Personal notes</h3>${p.notes ? `<div class="note-body">${L.md(p.notes)}</div>` : '<p class="small text-muted-lmt">No notes.</p>'}</div>
        </div><div class="col-lg-5"><div class="card-lmt card-pad">
          <div class="d-flex justify-content-between mb-1"><strong>Progress</strong><strong>${Math.round(pr)}%</strong></div>${L.progressBar(pr, { height: 'thick', cls: p.status === 'Completed' ? 'green' : '', label: 'Project progress' })}
          <div class="small text-muted-lmt mt-1">${p.progressMode === 'manual' ? 'Manual progress (edit project to change)' : `${items.filter(i => i.done).length} of ${items.length} checklist items completed`}</div>
          <label class="form-label small mt-3" for="dmMode">Tracking mode</label>
          <select class="form-select form-select-sm" id="dmMode"><option value="auto" ${p.progressMode !== 'manual' ? 'selected' : ''}>Automatic (checklists)</option><option value="manual" ${p.progressMode === 'manual' ? 'selected' : ''}>Manual</option></select>
          ${p.progressMode === 'manual' ? `<label class="form-label small mt-2" for="dmManual">Manual progress: ${L.num(p.manualProgress)}%</label><input type="range" class="form-range" id="dmManual" min="0" max="100" step="5" value="${L.num(p.manualProgress)}">` : ''}
          <hr style="border-color:var(--lmt-border)">
          <div class="row g-2 small"><div class="col-6"><div class="text-muted-lmt">Start</div>${L.fmt(p.startDate)}</div><div class="col-6"><div class="text-muted-lmt">Target</div><span class="${L.isOverdue(p.targetDate, p.status) ? 'text-danger' : ''}">${L.fmt(p.targetDate)}</span></div>
            <div class="col-6"><div class="text-muted-lmt">Completed</div>${L.fmt(p.completionDate)}</div><div class="col-6"><div class="text-muted-lmt">Hours (actual / est.)</div>${L.num(p.actualHours)} / ${L.num(p.estimatedHours)}h</div></div>
          <label class="form-label small mt-3" for="dmHours">Log additional hours</label>
          <div class="input-group input-group-sm"><input type="number" class="form-control" id="dmHours" min="0.25" max="100" step="0.25" placeholder="e.g. 1.5"><button class="btn btn-outline-lmt" data-act="log-hours">Add</button></div>
          <div class="d-grid gap-2 mt-3">${p.status !== 'Completed' ? `<button class="btn btn-accent" data-act="complete"><i class="bi bi-trophy"></i> Mark as completed</button>${pr >= 100 ? '<div class="small text-muted-lmt text-center">Progress is 100% — completion still requires your confirmation.</div>' : ''}` : `<div class="text-center text-success small"><i class="bi bi-trophy-fill"></i> Completed on ${L.fmt(p.completionDate)}</div><button class="btn btn-outline-lmt btn-sm" data-act="reopen"><i class="bi bi-arrow-counterclockwise"></i> Reopen project</button>`}
            <button class="btn btn-outline-lmt btn-sm" data-act="edit"><i class="bi bi-pencil"></i> Edit details</button></div>
        </div></div></div>`;
    } else if (LISTS[activeTab]) body = `<h3 class="h6">${LISTS[activeTab]}</h3>${checklist(p, activeTab)}`;
    else body = `<div>${p.history.slice().reverse().map(h => `<div class="list-row px-0"><span class="dot"></span><div class="flex-grow-1 small">${esc(h.event)}</div><span class="kpi-hint">${L.fmtTs(h.date)}</span></div>`).join('') || '<p class="small text-muted-lmt">No history.</p>'}</div>`;
    $('dmBody').innerHTML = `<ul class="nav nav-tabs mb-3" role="tablist">${tab('overview', 'Overview')}${tab('features', 'Features', cnt('features'))}${tab('testing', 'Testing', cnt('testing'))}${tab('deployment', 'Deployment', cnt('deployment'))}${tab('history', 'History')}</ul><div role="tabpanel">${body}</div>`;
  }
  function openDetail(id, tab = 'overview') { openId = id; activeTab = tab; renderDetail(); detailModal.show(); }

  function findItem(p, list, id, parent) {
    const arr = p[list] || [];
    if (parent) { const par = arr.find(i => i.id === parent); return par ? { arr: par.subtasks, item: par.subtasks.find(s => s.id === id), parentItem: par } : {}; }
    return { arr, item: arr.find(i => i.id === id) };
  }
  $('dmBody').addEventListener('click', async e => {
    const t = e.target.closest('[data-tab]'); if (t) { activeTab = t.dataset.tab; renderDetail(); $('dmBody').querySelector(`[data-tab="${activeTab}"]`)?.focus(); return; }
    const b = e.target.closest('[data-act]'); if (!b || b.dataset.act === 'toggle') return;
    const p = L.project(openId); if (!p) return;
    const act = b.dataset.act, row = b.closest('[data-item]');
    if (act === 'complete') return complete(p);
    if (act === 'reopen') return reopen(p);
    if (act === 'edit') { detailModal.hide(); return openForm(p); }
    if (act === 'log-hours') {
      const v = L.num($('dmHours').value, 0);
      if (v <= 0 || v > 100) { L.toast('Enter between 0.25 and 100 hours.', 'danger'); return; }
      p.actualHours = L.r1(L.num(p.actualHours) + v); touch(p, `Logged ${v}h`); L.save(); L.toast(`${v}h logged.`); return;
    }
    if (!row) return;
    const { arr, item } = findItem(p, row.dataset.list, row.dataset.item, row.dataset.parent);
    if (!item) return;
    if (act === 'remove') {
      if (!(await L.confirm(`Remove "${item.text}"${item.subtasks && item.subtasks.length ? ' and its subtasks' : ''}?`, { title: 'Remove item', ok: 'Remove', danger: true }))) return;
      arr.splice(arr.indexOf(item), 1); touch(p, `Removed item "${item.text}"`);
    } else if (act === 'rename') {
      const label = row.querySelector('label');
      label.innerHTML = `<input class="form-control form-control-sm" value="${esc(item.text)}" maxlength="160" aria-label="Rename item">`;
      const inp = label.querySelector('input'); inp.focus(); inp.select();
      const finish = ok => { const v = inp.value.trim(); if (ok && v && v !== item.text) { item.text = v; touch(p); L.save(); } else renderDetail(); };
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); finish(true); } if (ev.key === 'Escape') { ev.stopPropagation(); finish(false); } });
      inp.addEventListener('blur', () => finish(true), { once: true });
      return;
    } else if (act === 'add-sub') {
      item.subtasks = item.subtasks || [];
      item.subtasks.push({ id: L.uid('ci'), text: 'New subtask', done: false });
      item.done = false; touch(p);
      L.save();
      const last = item.subtasks[item.subtasks.length - 1];
      setTimeout(() => $('dmBody').querySelector(`[data-item="${CSS.escape(last.id)}"] [data-act="rename"]`)?.click(), 30);
      return;
    }
    L.save();
  });
  $('dmBody').addEventListener('change', e => {
    const p = L.project(openId); if (!p) return;
    if (e.target.id === 'dmMode') { p.progressMode = e.target.value; touch(p, `Progress mode set to ${p.progressMode}`); L.save(); return; }
    if (e.target.id === 'dmManual') { p.manualProgress = L.clamp(L.num(e.target.value), 0, 100); touch(p, `Manual progress set to ${p.manualProgress}%`); L.save(); return; }
    if (e.target.dataset.act !== 'toggle') return;
    const row = e.target.closest('[data-item]');
    const { item, parentItem } = findItem(p, row.dataset.list, row.dataset.item, row.dataset.parent);
    if (!item) return;
    item.done = e.target.checked;
    if (parentItem) parentItem.done = parentItem.subtasks.every(s => s.done);
    if (p.status === 'Planned' && item.done) { p.status = 'In Progress'; if (!p.startDate) p.startDate = L.today(); }
    touch(p, `${item.done ? 'Completed' : 'Unchecked'} "${item.text}"`);
    L.save();
  });
  $('dmBody').addEventListener('submit', e => {
    const f = e.target.closest('[data-add]'); if (!f) return;
    e.preventDefault();
    const p = L.project(openId), inp = f.querySelector('input'), v = inp.value.trim();
    if (!v) { inp.classList.add('is-invalid'); return; }
    const key = f.dataset.add;
    p[key] = p[key] || [];
    p[key].push(key === 'features' ? { id: L.uid('ci'), text: v, done: false, subtasks: [] } : { id: L.uid('ci'), text: v, done: false });
    touch(p, `Added ${key} item "${v}"`); L.save();
    setTimeout(() => $('add-' + key)?.focus(), 20);
  });
  $('detailModal').addEventListener('hidden.bs.modal', () => { openId = null; });

  /* ---------- Events ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('#projectGrid [data-act]'); if (!b) return;
    const card = b.closest('[data-id]'), p = card ? L.project(card.dataset.id) : null, act = b.dataset.act;
    if (act === 'new') openForm();
    else if (!p) return;
    else if (act === 'open') openDetail(p.id);
    else if (act === 'edit') openForm(p);
    else if (act === 'delete') remove(p);
    else if (act === 'complete') complete(p);
  });
  $('btnNewProject').addEventListener('click', () => openForm());
  $('pSearch').addEventListener('input', L.debounce(render, 200));
  ['pStatus', 'pPriority', 'pSort', 'pView'].forEach(i => $(i).addEventListener('change', render));

  /* ---------- Component labs (one mini project per topic) ---------- */
  function fillLabCategories() {
    const sel = $('labCat'); if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">All categories</option>' + L.sortedCategories().map(c => `<option value="${esc(c.id)}">${esc(c.code ? c.code + '. ' : '')}${esc(c.name)}</option>`).join('');
    if (L.category(current)) sel.value = current;
  }
  function renderLabs() {
    if (!$('labList')) return;
    fillLabCategories();
    const q = $('labSearch').value.trim().toLowerCase(), cat = $('labCat').value, state = $('labState').value;
    const all = L.state.topics.filter(t => t.lab);
    const finished = all.filter(t => L.labStats(t).pct === 100).length;
    $('labsCount').textContent = `${all.length} labs · ${finished} finished`;
    const list = all.filter(t => {
      const st = L.labStats(t);
      if (state === 'open' && st.pct === 100) return false;
      if (state === 'done' && st.pct !== 100) return false;
      if (q && !`${t.id} ${t.title} ${t.lab.title} ${t.lab.brief} ${(t.lab.criteria || []).map(c => c.text).join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (!list.length) { $('labList').innerHTML = L.emptyState('bi-boxes', 'No component labs match', 'Try another search, category or filter.'); return; }
    const open = !!(q || cat || state !== 'all');
    $('labList').innerHTML = L.sortedCategories().map(c => {
      const items = list.filter(t => t.categoryId === c.id);
      if (!items.length) return '';
      const done = items.filter(t => L.labStats(t).pct === 100).length;
      return `<details class="mb-2" ${open ? 'open' : ''} style="border:1px solid var(--lmt-border);border-radius:12px;padding:.5rem .75rem">
        <summary class="d-flex align-items-center gap-2 flex-wrap" style="cursor:pointer"><i class="bi ${esc(c.icon || 'bi-folder')} text-primary-lmt"></i><strong class="small">${esc(c.code ? c.code + '. ' : '')}${esc(c.name)}</strong>
          <span class="badge-lmt ${done === items.length ? 'st-done' : 'st-ns'} ms-auto">${done}/${items.length} labs complete</span></summary>
        <div class="mt-3">${items.map(t => {
          const st = L.labStats(t);
          return `<div class="card-lmt card-pad mb-2" data-lab-topic="${esc(t.id)}">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div class="min-w-0"><div class="d-flex flex-wrap gap-1 align-items-center mb-1"><span class="topic-id">${esc(t.id)}</span>${L.diffBadge(t.difficulty)}${t.status === 'Completed' ? L.statusBadge('Completed') : ''}</div>
                <h4 class="h6 fw-bold mb-1">${esc(t.lab.title)}</h4><div class="small text-muted-lmt">${esc(t.lab.brief)}</div></div>
              <div class="text-end" style="min-width:130px"><div class="small mb-1"><strong>${st.done}/${st.total}</strong> criteria</div>${L.progressBar(st.pct, { cls: st.pct === 100 ? 'green' : 'accent', label: 'Lab criteria for ' + t.title })}</div>
            </div>
            <div class="small mt-2"><strong>Deliverable:</strong> ${esc(t.lab.deliverable)}</div>
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2"><div class="flex-grow-1">${(t.lab.criteria || []).map(c => `<div class="form-check small"><input class="form-check-input" type="checkbox" id="lc-${esc(c.id)}" data-lab-crit="${esc(c.id)}" ${c.done ? 'checked' : ''}><label class="form-check-label" for="lc-${esc(c.id)}">${esc(c.text)}</label></div>`).join('')}</div>
              <div class="d-flex flex-column gap-1">${L.link(t.evidenceUrl, 'Evidence', 'bi-patch-check')}<a class="btn btn-sm btn-outline-lmt" href="roadmap.html?topic=${encodeURIComponent(t.id)}"><i class="bi bi-signpost-split"></i> Topic & guided steps</a></div></div>
          </div>`;
        }).join('')}</div></details>`;
    }).join('');
  }
  $('labList').addEventListener('change', e => {
    const cb = e.target.closest('[data-lab-crit]'); if (!cb) return;
    const t = L.topic(cb.closest('[data-lab-topic]').dataset.labTopic);
    if (!t || !t.lab) return;
    const c = t.lab.criteria.find(x => x.id === cb.dataset.labCrit); if (!c) return;
    c.done = cb.checked; t.updatedAt = new Date().toISOString();
    L.log('topic', `${cb.checked ? 'Met' : 'Unmet'} lab criterion on ${t.id}: ${c.text.slice(0, 50)}`, t.id);
    L.save();
    if (L.labStats(t).pct === 100) L.toast(`Lab for ${t.id} is complete. Attach the repository as evidence, then finish the topic steps.`, 'success');
  });
  $('labSearch').addEventListener('input', L.debounce(renderLabs, 200));
  ['labCat', 'labState'].forEach(i => $(i).addEventListener('change', renderLabs));

  L.onChange(render);
  L.onChange(renderLabs);
  render();
  renderLabs();
  const qp = L.param('project');
  if (qp) { if (L.project(qp)) openDetail(qp); else L.toast('Project not found.', 'warning'); }
})();
