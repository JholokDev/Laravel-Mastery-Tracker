'use strict';
/* Analytics page — charts generated purely from stored data */
(() => {
  const L = LMT, $ = id => document.getElementById(id), esc = L.esc;

  function kpi(label, value, hint, icon, cls = '') {
    return `<div class="col-6 col-md-4 col-xl-2"><div class="kpi-card"><div class="d-flex justify-content-between"><div class="kpi-label">${label}</div><div class="kpi-icon ${cls}" style="width:34px;height:34px;font-size:1rem"><i class="bi ${icon}"></i></div></div><div class="kpi-value">${value}</div><div class="kpi-hint">${hint}</div></div></div>`;
  }
  const noData = (id, msg) => { const el = $(id); if (el) { const box = el.parentElement; if (!box.querySelector('.nodata')) box.insertAdjacentHTML('beforeend', `<div class="nodata position-absolute top-50 start-50 translate-middle small text-muted-lmt text-center">${esc(msg)}</div>`); } };
  const clearNoData = id => { const el = $(id); el && el.parentElement.querySelectorAll('.nodata').forEach(n => n.remove()); };

  function render() {
    const s = L.state, ts = L.topicStats(), st = L.streaks(), c = L.chartColors(), t = L.today();
    const days = Object.values(s.days), recorded = days.filter(d => L.num(d.actualMinutes) > 0);
    const totalMin = L.totalStudyMinutes();
    $('aKpis').innerHTML =
      kpi('Topic completion', ts.completionPct.toFixed(1) + '%', `${ts.completed}/${ts.total} topics`, 'bi-check2-circle') +
      kpi('Weighted progress', ts.weightedPct.toFixed(1) + '%', 'Avg. topic progress', 'bi-sliders') +
      kpi('Hours-weighted', ts.hoursPct.toFixed(1) + '%', `of ${ts.totalHours} est. hours`, 'bi-hourglass-split', 'accent') +
      kpi('Study hours', L.r1(totalMin / 60), `${days.length} daily records`, 'bi-clock-history') +
      kpi('Avg / active day', recorded.length ? Math.round(totalMin / recorded.length) + 'm' : '—', `${recorded.length} active days`, 'bi-speedometer2', 'green') +
      kpi('Check-ins', st.checkins, `Streak ${st.current} · best ${st.longest}`, 'bi-fire', 'accent');

    // Category comparison
    const cs = L.categoryStats();
    L.chart('cCategory', { type: 'bar', data: { labels: cs.map(x => x.category.name), datasets: [
      { label: 'Completion %', data: cs.map(x => L.r1(x.completionPct)), backgroundColor: c.primary, borderRadius: 4 },
      { label: 'Weighted %', data: cs.map(x => L.r1(x.weightedPct)), backgroundColor: c.secondary, borderRadius: 4 },
      { label: 'Hours-weighted %', data: cs.map(x => L.r1(x.hoursPct)), backgroundColor: c.accent, borderRadius: 4 }] },
      options: { indexAxis: 'y', scales: { x: { beginAtZero: true, max: 100 } } } });

    L.chart('cStatus', { type: 'doughnut', data: { labels: ['Completed', 'In Progress', 'Not Started'], datasets: [{ data: [ts.completed, ts.inProgress, ts.notStarted], backgroundColor: ['#22C55E', c.secondary, 'rgba(148,163,184,.35)'], borderColor: c.surface, borderWidth: 3 }] }, options: { cutout: '68%', plugins: { legend: { position: 'bottom' } } } });

    // Daily minutes & streak
    const n = L.num($('range').value, 30);
    const range = [...Array(n)].map((_, i) => L.addDays(t, i - n + 1));
    const label = d => L.fmt(d, { day: 'numeric', month: 'short' });
    L.chart('cDaily', { type: 'bar', data: { labels: range.map(label), datasets: [
      { label: 'Actual minutes', data: range.map(d => L.dayStats(L.getDay(d)).actual), backgroundColor: c.secondary, borderRadius: 3 },
      { label: 'Planned minutes', type: 'line', data: range.map(d => { const r = L.getDay(d); return r ? L.num(r.plannedMinutes) : null; }), borderColor: c.accent, backgroundColor: c.accent, pointRadius: 2, spanGaps: false }] },
      options: { scales: { y: { beginAtZero: true }, x: { ticks: { maxTicksLimit: 10 } } } } });
    L.chart('cStreak', { type: 'line', data: { labels: range.map(label), datasets: [{ label: 'Streak (days)', data: range.map(d => L.streakAt(d)), borderColor: c.accent, backgroundColor: 'rgba(255,159,67,.15)', fill: true, stepped: true, pointRadius: 0 }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 6 } } } } });
    (st.checkins ? clearNoData : id => noData(id, 'No check-ins recorded yet'))('cStreak');
    (days.length ? clearNoData : id => noData(id, 'No daily records yet'))('cDaily');

    // Weekly
    const ws = L.weekStart(t), weeks = [...Array(12)].map((_, i) => L.addDays(ws, (i - 11) * 7)).map(w => L.weekStats(w));
    L.chart('cWeekly', { type: 'bar', data: { labels: weeks.map(w => L.fmt(w.start, { day: 'numeric', month: 'short' })), datasets: [
      { label: 'Study hours', data: weeks.map(w => L.r1(w.hours)), backgroundColor: c.primary, borderRadius: 5 },
      { label: 'Target hours', type: 'line', data: weeks.map(w => w.targetHours), borderColor: c.accent, borderDash: [6, 4], pointRadius: 0 }] }, options: { scales: { y: { beginAtZero: true } } } });

    // Monthly
    const now = new Date(), months = [...Array(12)].map((_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1));
    const mKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mMin = {}, mDays = {};
    days.forEach(d => { const k = d.date.slice(0, 7); mMin[k] = (mMin[k] || 0) + L.num(d.actualMinutes); if (d.checkedIn) mDays[k] = (mDays[k] || 0) + 1; });
    L.chart('cMonthly', { type: 'bar', data: { labels: months.map(m => m.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })), datasets: [
      { label: 'Study hours', data: months.map(m => L.r1((mMin[mKey(m)] || 0) / 60)), backgroundColor: c.secondary, borderRadius: 5, yAxisID: 'y' },
      { label: 'Check-in days', type: 'line', data: months.map(m => mDays[mKey(m)] || 0), borderColor: c.accent, backgroundColor: c.accent, yAxisID: 'y1', tension: .3 }] },
      options: { scales: { y: { beginAtZero: true, position: 'left' }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { precision: 0 } } } } });

    // Completed topics over time
    const comp = s.topics.filter(x => x.status === 'Completed' && L.parse(x.completionDate)).map(x => x.completionDate).sort();
    if (comp.length) {
      clearNoData('cCompleted');
      let startD = comp[0] < L.addDays(t, -364) ? L.addDays(t, -364) : comp[0];
      const span = Math.max(1, L.diffDays(startD, t) + 1), step = Math.max(1, Math.ceil(span / 60));
      const pts = []; for (let i = 0; i < span; i += step) pts.push(L.addDays(startD, i)); if (pts[pts.length - 1] !== t) pts.push(t);
      const before = comp.filter(d => d < startD).length;
      L.chart('cCompleted', { type: 'line', data: { labels: pts.map(label), datasets: [{ label: 'Completed topics (cumulative)', data: pts.map(p => before + comp.filter(d => d >= startD && d <= p).length), borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,.12)', fill: true, tension: .25, pointRadius: 2 }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    } else { L.chart('cCompleted', { type: 'line', data: { labels: [], datasets: [] } }); noData('cCompleted', 'Complete a topic to see your trend'); }

    // Projects
    const ps = s.projects;
    L.chart('cProjects', { type: 'bar', data: { labels: ps.map(p => p.name.length > 26 ? p.name.slice(0, 25) + '…' : p.name), datasets: [{ label: 'Progress %', data: ps.map(p => L.r1(L.projectProgress(p))), backgroundColor: ps.map(p => p.status === 'Completed' ? '#22C55E' : c.secondary), borderRadius: 5 }] }, options: { indexAxis: 'y', scales: { x: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } } });
    (ps.length ? clearNoData : id => noData(id, 'No projects yet'))('cProjects');
    L.chart('cEstAct', { type: 'bar', data: { labels: ps.map(p => p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name), datasets: [
      { label: 'Estimated hours', data: ps.map(p => L.num(p.estimatedHours)), backgroundColor: 'rgba(148,163,184,.45)', borderRadius: 5 },
      { label: 'Actual hours', data: ps.map(p => L.num(p.actualHours)), backgroundColor: c.accent, borderRadius: 5 }] }, options: { scales: { y: { beginAtZero: true } } } });

    // Learning est vs actual
    const doneEst = ts.completedHours, inProgEst = s.topics.filter(x => x.status === 'In Progress').reduce((a, x) => a + L.num(x.hours) * L.num(x.progress) / 100, 0);
    const earned = doneEst + inProgEst, actualH = totalMin / 60;
    const ratio = earned ? actualH / earned : 0;
    $('learnHours').innerHTML = `<div class="mb-3"><div class="kpi-label">Estimated hours earned</div><div class="kpi-value">${L.r1(earned)}h</div><div class="kpi-hint">Completed topics (${doneEst}h) + progress-weighted in-progress topics</div></div>
      <div class="mb-3"><div class="kpi-label">Actual study hours recorded</div><div class="kpi-value">${L.r1(actualH)}h</div><div class="kpi-hint">From daily records</div></div>
      <div class="mb-2"><div class="kpi-label">Actual ÷ estimated</div><div class="kpi-value ${ratio > 1.3 ? 'text-accent' : ''}">${earned ? ratio.toFixed(2) + '×' : '—'}</div></div>
      <p class="small text-muted-lmt mb-0">${!earned ? 'Complete or progress topics to compare estimates with real effort.' : ratio > 1.3 ? 'You are spending more time than estimated — consider revising topic estimates.' : ratio < 0.7 ? 'You are progressing faster than estimated, or not all study time is being recorded.' : 'Your estimates are well calibrated.'}</p>`;
  }
  $('range').addEventListener('change', render);
  L.onChange(render);
  render();
})();
