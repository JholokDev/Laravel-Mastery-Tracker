'use strict';
/* Settings page — preferences, import/export, maintenance */
(() => {
  const L = LMT, $ = id => document.getElementById(id), esc = L.esc;

  function render() {
    const s = L.state.settings;
    if (!$('profileForm').contains(document.activeElement)) {
      $('sName').value = s.name || ''; $('sRole').value = s.role || ''; $('sTheme').value = s.theme || 'dark';
      $('sDaily').value = s.dailyTarget; $('sWeekly').value = s.weeklyTargetHours;
    }
    const raw = localStorage.getItem(L.KEY) || '';
    const kb = (new Blob([raw]).size / 1024);
    const st = L.state;
    $('storageInfo').innerHTML = `<div class="row g-2 small">
      <div class="col-6 col-md-4"><div class="text-muted-lmt">Data size</div><strong>${kb.toFixed(1)} KB</strong></div>
      <div class="col-6 col-md-4"><div class="text-muted-lmt">Topics</div><strong>${st.topics.length}</strong></div>
      <div class="col-6 col-md-4"><div class="text-muted-lmt">Categories</div><strong>${st.categories.length}</strong></div>
      <div class="col-6 col-md-4"><div class="text-muted-lmt">Daily records</div><strong>${Object.keys(st.days).length}</strong></div>
      <div class="col-6 col-md-4"><div class="text-muted-lmt">Projects</div><strong>${st.projects.length}</strong></div>
      <div class="col-6 col-md-4"><div class="text-muted-lmt">Notes</div><strong>${st.notes.length}</strong></div>
      <div class="col-6 col-md-4"><div class="text-muted-lmt">Skills</div><strong>${st.skills.length}</strong></div>
      <div class="col-6 col-md-4"><div class="text-muted-lmt">Weekly reviews</div><strong>${Object.keys(st.weeklyReviews).length}</strong></div>
      <div class="col-6 col-md-4"><div class="text-muted-lmt">Storage key</div><code>${esc(L.KEY)}</code></div></div>
      <div class="mt-3">${L.progressBar(Math.min(100, kb / 5120 * 100), { cls: 'accent', label: 'Approximate storage usage of 5 MB' })}<div class="kpi-hint mt-1">Approx. ${(kb / 5120 * 100).toFixed(2)}% of a typical 5 MB browser quota</div></div>`;
  }

  $('profileForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target; $('sName').value = $('sName').value.trim();
    f.classList.add('was-validated');
    if (!f.checkValidity()) { L.toast('Please fix the highlighted fields.', 'danger'); return; }
    Object.assign(L.state.settings, { name: $('sName').value, role: $('sRole').value.trim(), dailyTarget: Math.round(L.num($('sDaily').value)), weeklyTargetHours: L.num($('sWeekly').value) });
    document.activeElement && document.activeElement.blur();
    L.setTheme($('sTheme').value);
    L.toast('Preferences saved.');
  });
  $('sTheme').addEventListener('change', e => L.setTheme(e.target.value));

  $('btnExport').addEventListener('click', () => {
    const data = Object.assign({ app: 'Laravel Mastery Tracker', type: 'full-backup', exportedAt: new Date().toISOString() }, L.state);
    L.download(`laravel-mastery-backup-${L.today()}.json`, JSON.stringify(data, null, 2));
    L.toast('Backup downloaded.');
  });
  $('btnExportNotes').addEventListener('click', () => {
    if (!L.state.notes.length) { L.toast('There are no notes to export.', 'warning'); return; }
    L.download(`lmt-notes-${L.today()}.json`, JSON.stringify({ app: 'Laravel Mastery Tracker', type: 'notes', exportedAt: new Date().toISOString(), notes: L.state.notes }, null, 2));
    L.toast('Notes exported.');
  });

  $('importFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const out = $('importResult');
    if (file.size > 10 * 1024 * 1024) { out.innerHTML = '<div class="danger-box small">File is larger than 10 MB — refusing to import.</div>'; e.target.value = ''; return; }
    out.innerHTML = L.skeleton(2);
    const reader = new FileReader();
    reader.onerror = () => { out.innerHTML = '<div class="danger-box small">Could not read the file.</div>'; };
    reader.onload = async () => {
      let obj;
      try { obj = JSON.parse(reader.result); } catch (err) { out.innerHTML = '<div class="danger-box small"><i class="bi bi-x-octagon"></i> Invalid JSON file.</div>'; e.target.value = ''; return; }
      if (obj && obj.type === 'notes' && Array.isArray(obj.notes)) {
        const valid = obj.notes.filter(n => n && typeof n === 'object' && n.id && n.title);
        if (!(await L.confirm(`Merge ${valid.length} note(s) into your notes? Notes with the same ID will be updated.`, { title: 'Import notes', ok: 'Merge notes' }))) { out.innerHTML = ''; e.target.value = ''; return; }
        valid.forEach(n => { const i = L.state.notes.findIndex(x => x.id === n.id); const clean = { id: String(n.id), title: String(n.title), type: ['note', 'snippet', 'doc', 'bookmark'].includes(n.type) ? n.type : 'note', body: String(n.body || ''), code: String(n.code || ''), lang: String(n.lang || ''), url: String(n.url || ''), tags: Array.isArray(n.tags) ? n.tags.map(String) : [], topicId: String(n.topicId || ''), projectId: String(n.projectId || ''), pinned: !!n.pinned, createdAt: n.createdAt || new Date().toISOString(), updatedAt: n.updatedAt || new Date().toISOString() }; if (i >= 0) L.state.notes[i] = clean; else L.state.notes.push(clean); });
        L.log('note', `Imported ${valid.length} note(s)`); L.save();
        out.innerHTML = `<div class="info-box small"><i class="bi bi-check-circle text-success"></i> Merged ${valid.length} note(s).</div>`; L.toast('Notes imported.');
        e.target.value = ''; return;
      }
      const err = L.validateBackup(obj);
      if (err) { out.innerHTML = `<div class="danger-box small"><i class="bi bi-x-octagon"></i> ${esc(err)}</div>`; e.target.value = ''; return; }
      const summary = `${obj.topics.length} topics, ${(obj.categories || []).length} categories, ${Object.keys(obj.days || {}).length} daily records, ${(obj.projects || []).length} projects, ${(obj.notes || []).length} notes`;
      const ok = await L.confirm(`This backup contains ${summary}${obj.exportedAt ? ` (exported ${new Date(obj.exportedAt).toLocaleString()})` : ''}.\n\nRestoring will REPLACE all current data. Continue?`, { title: 'Restore backup', ok: 'Replace my data', danger: true });
      if (!ok) { out.innerHTML = ''; e.target.value = ''; return; }
      delete obj.app; delete obj.type; delete obj.exportedAt;
      L.replaceState(obj);
      L.log('system', 'Restored data from backup'); L.save();
      out.innerHTML = `<div class="info-box small"><i class="bi bi-check-circle text-success"></i> Backup restored: ${esc(summary)}.</div>`;
      L.toast('Backup restored successfully.');
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  $('btnMerge').addEventListener('click', async () => {
    const seed = LMT_SEED.build();
    const newCats = seed.categories.filter(c => !L.category(c.id));
    const newTopics = seed.topics.filter(t => !L.topic(t.id));
    const newProjects = seed.projects.filter(p => !L.project(p.id));
    if (!newCats.length && !newTopics.length && !newProjects.length) { L.toast('All default categories, topics, labs and projects are already present.', 'info'); return; }
    if (!(await L.confirm(`Add ${newCats.length} category(ies), ${newTopics.length} topic(s) and ${newProjects.length} project(s) from the default roadmap? Your progress and custom items are untouched.`, { title: 'Restore defaults', ok: 'Add missing items' }))) return;
    L.state.categories.push(...newCats);
    newTopics.forEach(t => { if (!L.category(t.categoryId)) return; L.ensureTopicMeta(t); L.state.topics.push(t); });
    L.state.projects.push(...newProjects);
    L.state.topics.forEach(t => L.ensureTopicMeta(t));
    L.log('system', `Restored ${newTopics.length} default topic(s) and ${newProjects.length} project(s)`);
    L.save(); L.toast('Missing default items restored.');
  });
  $('btnClearActivity').addEventListener('click', async () => {
    if (!(await L.confirm('Clear the entire activity log?', { title: 'Clear activity', ok: 'Clear', danger: true }))) return;
    L.state.activity = []; L.save(); L.toast('Activity log cleared.');
  });
  $('btnReset').addEventListener('click', async () => {
    const ok = await L.confirm('This permanently deletes ALL your data in this browser and restores the default roadmap. Export a backup first if you might need it.', { title: 'Reset all data', ok: 'Reset everything', danger: true, requireText: 'RESET' });
    if (!ok) return;
    const theme = L.state.settings.theme;
    const fresh = LMT_SEED.build(); fresh.settings.theme = theme;
    L.replaceState(fresh);
    L.toast('All data has been reset.', 'info');
  });

  L.onChange(render);
  render();
})();
