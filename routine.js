'use strict';
/* Daily routine page — records, tasks, check-ins, carry-forward, heatmap, weekly summary */
(() => {
  const L = LMT, $ = id => document.getElementById(id), esc = L.esc;
  const taskModal = new bootstrap.Modal($('taskModal'));
  const carryModal = new bootstrap.Modal($('carryModal'));
  let date = L.param('date') && L.parse(L.param('date')) ? L.param('date') : L.today();
  let weekOffset = 0;

  const touch = rec => { rec.updatedAt = new Date().toISOString(); };

  /* ---------- Warning & navigation ---------- */
  function renderWarning() {
    const t = L.today(), rec = L.getDay(t);
    $('todayWarning').innerHTML = !rec
      ? `<div class="warning-box d-flex flex-wrap align-items-center gap-2 mb-3"><i class="bi bi-exclamation-triangle-fill text-accent"></i><span><strong>No daily record exists for today.</strong> Missing days stay missing — create a record and check in to count this day.</span>${date !== t ? '<button class="btn btn-sm btn-accent ms-auto" data-goto-today>Go to today</button>' : ''}</div>`
      : !rec.checkedIn ? `<div class="info-box d-flex flex-wrap align-items-center gap-2 mb-3"><i class="bi bi-info-circle-fill text-primary-lmt"></i><span>You haven't checked in for today yet.</span>${date !== t ? '<button class="btn btn-sm btn-primary ms-auto" data-goto-today>Go to today</button>' : ''}</div>` : '';
  }
  $('todayWarning').addEventListener('click', e => { if (e.target.closest('[data-goto-today]')) setDate(L.today()); });
  function setDate(d) { if (!L.parse(d)) return; date = d; try { history.replaceState(null, '', `?date=${d}`); } catch (e) { /* file:// may block */ } renderAll(); }

  /* ---------- Day panel ---------- */
  function renderDay() {
    const t = L.today(), rec = L.getDay(date), s = L.dayStats(rec);
    $('dateInput').value = date;
    $('dateLabel').textContent = L.fmt(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('dateSub').textContent = date === t ? 'Today' : date < t ? `${L.diffDays(date, t)} day(s) ago` : `In ${L.diffDays(t, date)} day(s) — planning ahead`;
    if (!rec) {
      $('dayPanel').innerHTML = `<div class="card-lmt">${L.emptyState('bi-calendar-plus', 'No record for this date', date > t ? 'You can plan future days in advance. Check-in is only possible on or after the date.' : 'Create a record to track tasks, minutes and reflections. Records are never created automatically.',
        `<div class="d-flex flex-wrap justify-content-center gap-2"><button class="btn btn-primary btn-sm" data-act="create-template"><i class="bi bi-plus-lg"></i> Create from routine template</button><button class="btn btn-outline-lmt btn-sm" data-act="create-empty">Create empty record</button></div>`)}</div>`;
      return;
    }
    const future = date > t;
    const topics = L.dayTopics(rec);
    $('dayPanel').innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-4"><div class="kpi-card d-flex align-items-center gap-3"><div class="ring" style="--p:${s.pct}"><span>${Math.round(s.pct)}%</span></div><div><div class="kpi-label">Task completion</div><div class="small text-muted-lmt">${s.done} of ${s.total} tasks</div></div></div></div>
        <div class="col-md-4"><div class="kpi-card"><div class="kpi-label">Study time vs target</div><div class="kpi-value">${s.actual}<small class="fs-6 text-muted-lmt"> / ${s.planned} min</small></div><div class="mt-2">${L.progressBar(s.timePct, { cls: 'accent', label: 'Minutes vs target' })}</div><div class="kpi-hint mt-1">${Math.round(s.timePct)}% of daily target</div></div></div>
        <div class="col-md-4"><div class="kpi-card d-flex flex-column justify-content-between"><div><div class="kpi-label">Check-in</div><div class="fw-bold mt-1 ${rec.checkedIn ? 'text-success' : 'text-muted-lmt'}"><i class="bi ${rec.checkedIn ? 'bi-patch-check-fill' : 'bi-patch-question'}"></i> ${rec.checkedIn ? 'Checked in' : 'Not checked in'}</div>${rec.checkInAt ? `<div class="kpi-hint">${L.fmtTs(rec.checkInAt)}</div>` : ''}</div>
          <button class="btn btn-sm mt-2 ${rec.checkedIn ? 'btn-outline-lmt' : 'btn-accent'}" data-act="checkin" ${future ? 'disabled title="You cannot check in for a future date"' : ''}>${rec.checkedIn ? '<i class="bi bi-x-circle"></i> Undo check-in' : '<i class="bi bi-check2-circle"></i> Check in for this day'}</button></div></div>
      </div>

      <div class="card-lmt mb-3">
        <div class="card-head"><h2><i class="bi bi-check2-square me-2 text-primary-lmt"></i>Tasks</h2>
          <div class="d-flex gap-2"><button class="btn btn-sm btn-outline-lmt" data-act="carry" ${rec.tasks.some(x => !x.done) ? '' : 'disabled'}><i class="bi bi-arrow-right-circle"></i> Carry forward</button><button class="btn btn-sm btn-primary" data-act="add-task"><i class="bi bi-plus-lg"></i> Add task</button></div></div>
        <div class="card-pad">
          ${rec.tasks.length ? rec.tasks.map((x, i) => taskRow(x, i, rec.tasks.length, 'day')).join('') : L.emptyState('bi-list-task', 'No tasks for this day', 'Add a task or apply your routine template.', '<button class="btn btn-sm btn-outline-lmt" data-act="apply-template">Add template tasks</button>')}
          ${rec.tasks.some(x => !x.done) && date === t ? `<div class="small text-muted-lmt mt-2"><i class="bi bi-hourglass-split"></i> ${rec.tasks.filter(x => !x.done).length} unfinished task(s) today. Tasks are never auto-completed — check them off when done or carry them forward.</div>` : ''}
        </div>
      </div>

      <div class="card-lmt mb-3"><div class="card-head"><h2><i class="bi bi-stopwatch me-2 text-accent"></i>Study minutes & topics</h2></div>
        <div class="card-pad"><div class="row g-3">
          <div class="col-sm-4"><label class="form-label" for="actualMinutes">Actual study minutes</label><input type="number" class="form-control" id="actualMinutes" min="0" max="1440" value="${s.actual}"><button type="button" class="btn btn-link btn-sm p-0 mt-1" data-act="use-task-minutes">Use completed task minutes (${rec.tasks.filter(x => x.done).reduce((a, x) => a + L.num(x.minutes), 0)})</button></div>
          <div class="col-sm-4"><label class="form-label" for="plannedMinutes">Target for this day</label><input type="number" class="form-control" id="plannedMinutes" min="0" max="1440" value="${s.planned}"></div>
          <div class="col-sm-4"><label class="form-label" for="addTopic">Add topic studied</label><select class="form-select" id="addTopic">${L.topicOptions([], { empty: 'Choose topic…' })}</select></div>
          <div class="col-12"><div class="kpi-label mb-1">Topics studied</div><div class="d-flex flex-wrap gap-1">${topics.length ? topics.map(id => { const tp = L.topic(id); const fromTask = rec.tasks.some(x => x.topicId === id); return tp ? `<span class="chip"><a href="roadmap.html?topic=${encodeURIComponent(id)}" class="text-decoration-none">${esc(id)} · ${esc(tp.title)}</a>${!fromTask ? `<button data-remove-topic="${esc(id)}" aria-label="Remove ${esc(tp.title)}"><i class="bi bi-x"></i></button>` : ''}</span>` : ''; }).join('') : '<span class="small text-muted-lmt">No topics linked yet. Link topics to tasks or add them here.</span>'}</div></div>
        </div></div></div>

      <div class="card-lmt mb-3"><div class="card-head"><h2><i class="bi bi-journal-text me-2 text-primary-lmt"></i>Daily reflection</h2><span class="save-indicator" id="saveIndicator"><i class="bi bi-cloud-check"></i> Auto-saved</span></div>
        <div class="card-pad"><div class="row g-3">
          <div class="col-12"><label class="form-label" for="r-reflection">Reflection / notes</label><textarea class="form-control" rows="3" id="r-reflection" data-field="reflection" placeholder="How did today's session go?">${esc(rec.reflection)}</textarea></div>
          <div class="col-md-4"><label class="form-label" for="r-achievements">Achievements</label><textarea class="form-control" rows="3" id="r-achievements" data-field="achievements">${esc(rec.achievements)}</textarea></div>
          <div class="col-md-4"><label class="form-label" for="r-difficulties">Difficulties</label><textarea class="form-control" rows="3" id="r-difficulties" data-field="difficulties">${esc(rec.difficulties)}</textarea></div>
          <div class="col-md-4"><label class="form-label" for="r-next">Next steps</label><textarea class="form-control" rows="3" id="r-next" data-field="nextSteps">${esc(rec.nextSteps)}</textarea></div>
        </div></div></div>
      <div class="text-end"><button class="btn btn-sm btn-ghost danger" data-act="delete-record"><i class="bi bi-trash"></i> Delete this day's record</button></div>`;
  }

  function taskRow(x, i, n, scope) {
    const tp = x.topicId ? L.topic(x.topicId) : null;
    const isDay = scope === 'day';
    return `<div class="task-row ${isDay && x.done ? 'done' : ''}" data-tid="${esc(x.id)}" data-scope="${scope}">
      ${isDay ? `<input type="checkbox" class="form-check-input" data-act="toggle" ${x.done ? 'checked' : ''} id="chk-${esc(x.id)}" aria-label="Mark ${esc(x.title)} complete">` : '<i class="bi bi-grip-vertical text-muted-lmt"></i>'}
      <div class="flex-grow-1 min-w-0"><label class="task-title d-block text-truncate" ${isDay ? `for="chk-${esc(x.id)}"` : ''}>${esc(x.title)}</label>
        <div class="small text-muted-lmt d-flex flex-wrap gap-2"><span><i class="bi bi-clock"></i> ${L.num(x.minutes)} min</span>${tp ? `<span><i class="bi bi-signpost-split"></i> ${esc(tp.id)} · ${esc(tp.title)}</span>` : ''}${x.carriedFrom ? `<span class="text-accent"><i class="bi bi-arrow-return-right"></i> from ${L.fmt(x.carriedFrom, { day: 'numeric', month: 'short' })}</span>` : ''}${x.carriedTo ? `<span><i class="bi bi-arrow-right"></i> carried to ${L.fmt(x.carriedTo, { day: 'numeric', month: 'short' })}</span>` : ''}</div></div>
      <div class="reorder"><button class="btn-ghost" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(x.title)} up"><i class="bi bi-chevron-up"></i></button><button class="btn-ghost" data-act="down" ${i === n - 1 ? 'disabled' : ''} aria-label="Move ${esc(x.title)} down"><i class="bi bi-chevron-down"></i></button></div>
      <button class="btn-ghost" data-act="edit" aria-label="Edit ${esc(x.title)}"><i class="bi bi-pencil"></i></button>
      <button class="btn-ghost danger" data-act="delete" aria-label="Delete ${esc(x.title)}"><i class="bi bi-trash"></i></button></div>`;
  }

  /* ---------- Template ---------- */
  function renderTemplate() {
    const tpl = L.state.routineTemplate;
    $('templateList').innerHTML = tpl.length ? tpl.map((x, i) => taskRow(x, i, tpl.length, 'template')).join('') : L.emptyState('bi-list', 'Template is empty');
    $('templateTotal').textContent = `${tpl.reduce((a, x) => a + L.num(x.minutes), 0)} min`;
    if (document.activeElement !== $('dailyTarget')) $('dailyTarget').value = L.state.settings.dailyTarget;
  }

  /* ---------- Weekly summary ---------- */
  function renderWeek() {
    const start = L.addDays(L.weekStart(L.today()), weekOffset * 7), w = L.weekStats(start), t = L.today();
    $('weekSummary').innerHTML = `<div class="small text-muted-lmt mb-2">${L.fmt(w.start, { day: 'numeric', month: 'short' })} – ${L.fmt(w.end, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      <div class="row g-2 text-center mb-2"><div class="col-4"><div class="kpi-label">Hours</div><div class="fw-bold">${L.r1(w.hours)}/${w.targetHours}</div></div><div class="col-4"><div class="kpi-label">Tasks</div><div class="fw-bold">${w.tasksDone}/${w.tasksTotal}</div></div><div class="col-4"><div class="kpi-label">Check-ins</div><div class="fw-bold">${w.checkins}/7</div></div></div>
      ${L.progressBar(w.hoursPct, { label: 'Weekly hours vs target' })}
      <div class="mt-2">${w.daily.map(d => `<div class="week-day ${d.date === t ? 'is-today' : ''}"><button class="btn btn-link btn-sm p-0 text-decoration-none" data-goto="${d.date}" style="color:inherit">${L.fmt(d.date, { weekday: 'short', day: 'numeric' })}</button>
        <span class="d-flex align-items-center gap-2">${d.exists ? `<span class="small text-muted-lmt">${d.actual}m · ${Math.round(d.pct)}%</span>` : `<span class="small text-muted-lmt">${d.date <= t ? 'missing' : '—'}</span>`}<i class="bi ${d.rec && d.rec.checkedIn ? 'bi-check-circle-fill text-success' : d.date <= t ? 'bi-circle text-muted-lmt' : 'bi-dash text-muted-lmt'}" aria-label="${d.rec && d.rec.checkedIn ? 'Checked in' : 'Not checked in'}"></i></span></div>`).join('')}</div>
      <a href="weekly-review.html?week=${w.start}" class="btn btn-sm btn-outline-lmt w-100 mt-2">Open weekly review</a>`;
  }
  $('weekSummary').addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) setDate(b.dataset.goto); });

  /* ---------- Heatmap ---------- */
  function renderHeatmap() {
    const t = L.today(), start = L.addDays(L.weekStart(t), -25 * 7);
    let html = '', total = 0, active = 0;
    for (let i = 0; i < 26 * 7; i++) {
      const d = L.addDays(start, i), rec = L.getDay(d), m = rec ? L.num(rec.actualMinutes) : 0;
      const lvl = !rec ? '' : m >= 180 ? 'l4' : m >= 90 ? 'l3' : m >= 45 ? 'l2' : m > 0 ? 'l1' : '';
      if (m > 0) { active++; total += m; }
      const fut = d > t;
      html += `<button type="button" class="hm-cell ${lvl} ${rec && rec.checkedIn ? 'checked' : ''} ${fut ? 'future' : ''} ${d === date ? 'selected' : ''}" data-date="${d}" ${fut ? 'tabindex="-1"' : ''} title="${L.fmt(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}: ${rec ? m + ' min' + (rec.checkedIn ? ' · checked in' : '') : 'no record'}" aria-label="${d}: ${rec ? m + ' minutes' : 'no record'}"></button>`;
    }
    $('heatmap').innerHTML = html;
    const st = L.streaks();
    $('heatmapSummary').textContent = `${active} active day(s) · ${L.r1(total / 60)} hours in the last 26 weeks · current streak ${st.current} · longest streak ${st.longest} · ${st.checkins} total check-ins`;
  }
  $('heatmap').addEventListener('click', e => { const c = e.target.closest('[data-date]'); if (c && !c.classList.contains('future')) setDate(c.dataset.date); });

  function renderAll() { renderWarning(); renderDay(); renderTemplate(); renderWeek(); renderHeatmap(); }

  /* ---------- Actions ---------- */
  function listFor(scope) { return scope === 'template' ? L.state.routineTemplate : (L.getDay(date) || { tasks: [] }).tasks; }
  function openTask(scope, task = null) {
    const f = $('taskForm'); f.classList.remove('was-validated'); f.reset();
    $('taskScope').value = scope; $('taskId').value = task ? task.id : '';
    $('taskModalTitle').textContent = `${task ? 'Edit' : 'Add'} ${scope === 'template' ? 'template item' : 'task'}`;
    $('taskTitle').value = task ? task.title : ''; $('taskMinutes').value = task ? L.num(task.minutes) : 30;
    $('taskTopic').innerHTML = L.topicOptions(task ? task.topicId : '', { empty: 'No topic' });
    taskModal.show();
  }
  $('taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target; $('taskTitle').value = $('taskTitle').value.trim();
    f.classList.add('was-validated'); if (!f.checkValidity()) return;
    const scope = $('taskScope').value, id = $('taskId').value, list = listFor(scope);
    const data = { title: $('taskTitle').value, minutes: L.clamp(L.num($('taskMinutes').value), 1, 1440), topicId: $('taskTopic').value };
    if (id) { const x = list.find(t => t.id === id); if (x) Object.assign(x, data); }
    else list.push(Object.assign({ id: L.uid(scope === 'template' ? 'rt' : 'task'), done: false }, data));
    if (scope === 'day') { touch(L.getDay(date)); L.log('routine', `${id ? 'Edited' : 'Added'} task "${data.title}" on ${date}`); }
    L.save(); taskModal.hide(); L.toast('Task saved.');
  });

  async function handleTaskAction(act, row) {
    const scope = row.dataset.scope, list = listFor(scope), idx = list.findIndex(t => t.id === row.dataset.tid);
    if (idx < 0) return;
    const x = list[idx], rec = scope === 'day' ? L.getDay(date) : null;
    if (act === 'toggle') {
      x.done = !x.done; x.doneAt = x.done ? new Date().toISOString() : null; touch(rec);
      L.log('routine', `${x.done ? 'Completed' : 'Unchecked'} task "${x.title}" (${date})`);
      L.save(); return;
    }
    if (act === 'up' && idx > 0) { [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; }
    else if (act === 'down' && idx < list.length - 1) { [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; }
    else if (act === 'edit') { openTask(scope, x); return; }
    else if (act === 'delete') {
      if (!(await L.confirm(`Delete "${x.title}"?`, { title: 'Delete task', ok: 'Delete', danger: true }))) return;
      list.splice(idx, 1); L.toast('Task deleted.');
    } else return;
    if (rec) touch(rec);
    L.save();
    const sel = document.querySelector(`[data-tid="${CSS.escape(x.id)}"] [data-act="${act}"]`); if (sel && !sel.disabled) sel.focus();
  }

  document.addEventListener('click', async e => {
    const row = e.target.closest('.task-row');
    const btn = e.target.closest('[data-act]');
    if (row && btn && btn.dataset.act !== 'toggle') { handleTaskAction(btn.dataset.act, row); return; }
    if (!btn || !$('dayPanel').contains(btn)) return;
    const act = btn.dataset.act, rec = L.getDay(date);
    if (act === 'create-template' || act === 'create-empty') {
      if (L.getDay(date)) { L.toast('A record already exists for this date.', 'warning'); return; }
      L.createDay(date, { fromTemplate: act === 'create-template' });
      L.log('routine', `Created daily record for ${date}`); L.save(); L.toast('Daily record created.');
    } else if (act === 'checkin' && rec) {
      if (date > L.today()) { L.toast('You cannot check in for a future date.', 'danger'); return; }
      rec.checkedIn = !rec.checkedIn; rec.checkInAt = rec.checkedIn ? new Date().toISOString() : null; touch(rec);
      L.log('routine', `${rec.checkedIn ? 'Checked in' : 'Removed check-in'} for ${date}`);
      L.save(); L.toast(rec.checkedIn ? `Checked in! Current streak: ${L.streaks().current} day(s) 🔥` : 'Check-in removed.', rec.checkedIn ? 'success' : 'info');
    } else if (act === 'add-task') openTask('day');
    else if (act === 'apply-template' && rec) {
      L.state.routineTemplate.forEach(r => rec.tasks.push({ id: L.uid('task'), title: r.title, minutes: r.minutes, topicId: r.topicId || '', done: false }));
      touch(rec); L.save(); L.toast('Template tasks added.');
    } else if (act === 'use-task-minutes' && rec) {
      rec.actualMinutes = rec.tasks.filter(x => x.done).reduce((a, x) => a + L.num(x.minutes), 0); touch(rec); L.save(); L.toast('Actual minutes updated.');
    } else if (act === 'carry' && rec) openCarry(rec);
    else if (act === 'delete-record' && rec) {
      if (!(await L.confirm(`Delete the entire record for ${L.fmt(date)}? Tasks, minutes, reflection and check-in for this date will be removed.`, { title: 'Delete daily record', ok: 'Delete record', danger: true }))) return;
      delete L.state.days[date]; L.log('routine', `Deleted daily record for ${date}`); L.save(); L.toast('Record deleted.');
    }
  });
  document.addEventListener('change', e => {
    const rec = L.getDay(date);
    if (e.target.matches('.task-row [data-act="toggle"]')) { handleTaskAction('toggle', e.target.closest('.task-row')); return; }
    if (!rec) return;
    if (e.target.id === 'actualMinutes' || e.target.id === 'plannedMinutes') {
      const v = L.num(e.target.value, -1);
      if (v < 0 || v > 1440) { e.target.classList.add('is-invalid'); L.toast('Minutes must be between 0 and 1440.', 'danger'); return; }
      rec[e.target.id] = Math.round(v); touch(rec);
      if (e.target.id === 'actualMinutes') L.log('routine', `Recorded ${Math.round(v)} study minutes for ${date}`);
      L.save(); L.toast('Minutes saved.');
    } else if (e.target.id === 'addTopic' && e.target.value) {
      rec.topics = rec.topics || []; if (!rec.topics.includes(e.target.value)) rec.topics.push(e.target.value);
      touch(rec); L.save();
    }
  });
  $('dayPanel').addEventListener('click', e => {
    const b = e.target.closest('[data-remove-topic]'); if (!b) return;
    const rec = L.getDay(date); rec.topics = (rec.topics || []).filter(x => x !== b.dataset.removeTopic); touch(rec); L.save();
  });
  const autosave = L.debounce(() => { L.persist(); const s = $('saveIndicator'); if (s) { s.innerHTML = '<i class="bi bi-cloud-check"></i> Saved'; } }, 500);
  $('dayPanel').addEventListener('input', e => {
    const field = e.target.dataset.field; if (!field) return;
    const rec = L.getDay(date); if (!rec) return;
    rec[field] = e.target.value; touch(rec);
    const s = $('saveIndicator'); if (s) s.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
    autosave();
  });

  /* ---------- Carry forward ---------- */
  function openCarry(rec) {
    const unfinished = rec.tasks.filter(x => !x.done);
    $('carryList').innerHTML = unfinished.map(x => `<div class="form-check"><input class="form-check-input" type="checkbox" value="${esc(x.id)}" id="cf-${esc(x.id)}" checked><label class="form-check-label" for="cf-${esc(x.id)}">${esc(x.title)} <span class="text-muted-lmt small">(${L.num(x.minutes)} min)</span>${x.carriedTo ? ` <span class="badge-lmt st-hold">already carried to ${L.fmt(x.carriedTo, { day: 'numeric', month: 'short' })}</span>` : ''}</label></div>`).join('');
    $('carryDate').value = L.addDays(date, 1);
    carryModal.show();
  }
  $('carryConfirm').addEventListener('click', () => {
    const rec = L.getDay(date), target = $('carryDate').value;
    if (!rec) return;
    if (!L.parse(target) || target === date) { L.toast('Choose a different, valid target date.', 'danger'); return; }
    const ids = [...$('carryList').querySelectorAll('input:checked')].map(i => i.value);
    if (!ids.length) { L.toast('Select at least one task.', 'warning'); return; }
    const created = !L.getDay(target);
    const dest = L.createDay(target, { fromTemplate: false });
    let added = 0;
    ids.forEach(id => {
      const x = rec.tasks.find(t => t.id === id); if (!x) return;
      if (dest.tasks.some(t => t.carriedFromId === x.id)) return;
      dest.tasks.push({ id: L.uid('task'), title: x.title, minutes: x.minutes, topicId: x.topicId || '', done: false, carriedFrom: date, carriedFromId: x.id });
      x.carriedTo = target; added++;
    });
    touch(rec); touch(dest);
    L.log('routine', `Carried ${added} unfinished task(s) from ${date} to ${target}`);
    L.save(); carryModal.hide();
    L.toast(added ? `${added} task(s) carried to ${L.fmt(target)}${created ? ' (new record created)' : ''}.` : 'Those tasks were already carried to that date.', added ? 'success' : 'info');
  });

  /* ---------- Controls ---------- */
  $('prevDay').addEventListener('click', () => setDate(L.addDays(date, -1)));
  $('nextDay').addEventListener('click', () => setDate(L.addDays(date, 1)));
  $('goToday').addEventListener('click', () => setDate(L.today()));
  $('dateInput').addEventListener('change', e => { if (e.target.value) setDate(e.target.value); });
  $('addTemplateItem').addEventListener('click', () => openTask('template'));
  $('saveTarget').addEventListener('click', () => {
    const v = L.num($('dailyTarget').value, 0);
    if (v < 15 || v > 1440) { $('dailyTarget').classList.add('is-invalid'); L.toast('Daily target must be between 15 and 1440 minutes.', 'danger'); return; }
    $('dailyTarget').classList.remove('is-invalid');
    L.state.settings.dailyTarget = Math.round(v); L.save(); L.toast('Default daily target saved.');
  });
  $('prevWeek').addEventListener('click', () => { weekOffset--; renderWeek(); });
  $('nextWeek').addEventListener('click', () => { weekOffset++; renderWeek(); });
  $('thisWeek').addEventListener('click', () => { weekOffset = 0; renderWeek(); });
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal.show')) return;
    if (e.key === 'ArrowLeft' && e.shiftKey) setDate(L.addDays(date, -1));
    if (e.key === 'ArrowRight' && e.shiftKey) setDate(L.addDays(date, 1));
  });

  L.onChange(renderAll);
  renderAll();
})();
