(function () {
  'use strict';
  const W = window.Widgets = window.Widgets || {};
  const neutral = '#edf7f5';
  const antSVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M16 15 9 10M24 15l7-5M15 21 7 19M25 21l8-2M15 27l-7 5M25 27l7 5M18 9l-4-5M22 9l4-5"/></g><g fill="currentColor"><ellipse cx="20" cy="29" rx="6" ry="8"/><ellipse cx="20" cy="20" rx="5" ry="5"/><circle cx="20" cy="11" r="5"/></g><circle cx="18" cy="10" r="1" fill="white"/><circle cx="22" cy="10" r="1" fill="white"/></svg>';
  const foxSVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 12 42 30 58 30 82 12 89 53 50 89 11 53Z" fill="#f8a064" stroke="#15274b" stroke-width="4"/><path d="m18 17 4 27 15-12M82 17l-4 27-15-12" fill="#ffe2b8"/><path d="M14 53 43 60 50 83 57 60 86 53 50 88Z" fill="#fff7e8"/><path d="m43 72 14 0-7 9Z" fill="#15274b"/><circle cx="34" cy="48" r="4" fill="#15274b"/><circle cx="66" cy="48" r="4" fill="#15274b"/></svg>';
  function painter(mode, paint, ink, colors, names, external) {
    if (external || mode !== 'free') return '';
    return '<div class="paint-panel pg-painter"><div class="pg-tool-choice" role="group" aria-label="בחירת כלי">' +
      '<button type="button" class="btn pg-tool ' + (paint ? 'is-selected' : '') + '" data-pg-tool="paint" aria-pressed="' + paint + '">צובעים</button>' +
      '<button type="button" class="btn pg-tool ' + (!paint ? 'is-selected' : '') + '" data-pg-tool="play" aria-pressed="' + !paint + '">משחקים</button></div>' +
      '<div class="pg-swatches" role="group" aria-label="צבע למכחול">' + colors.map((c, i) => '<button type="button" class="pg-swatch ' + (ink === i ? 'is-selected' : '') + '" style="--swatch:' + c + '" data-pg-color="' + i + '" aria-label="צבע ' + names[i] + '" aria-pressed="' + (ink === i) + '" title="' + names[i] + '">' + (ink === i ? '✓' : '') + '</button>').join('') +
      '<button type="button" class="btn secondary pg-eraser ' + (ink === -1 ? 'is-selected' : '') + '" data-pg-color="-1" aria-pressed="' + (ink === -1) + '">מחק</button></div><button type="button" class="btn secondary" data-pg-clear>ניקוי צביעה</button></div>';
  }
  function colorStats(indices, values, colors, names) {
    const entries = colors.map((c, i) => {
      const positions = indices.map((v, j) => v === i ? j : -1).filter(j => j >= 0);
      if (!positions.length) return '';
      const count = positions.length;
      const sum = values ? positions.reduce((a, j) => a + values[j], 0) : null;
      return '<span class="pg-color-stat"><i style="background:' + c + '" aria-hidden="true"></i>' + names[i] + ': <strong>' + (values ? sum : count) + '</strong>' + (values ? ' <small>(' + count + ' קלפים)</small>' : '') + '</span>';
    }).join('');
    const unpainted = indices.filter(i => i < 0).length;
    return '<div class="pg-color-stats" aria-label="' + (values ? 'סכומי הקלפים לפי צבע מקורי' : 'מספר משבצות מכל צבע') + '">' + (values ? '<strong>סכום כל צבע:</strong>' : '<strong>משבצות מכל צבע:</strong>') + entries + (unpainted ? '<span class="muted">ללא צבע: ' + unpainted + '</span>' : '') + '</div>';
  }
  function colorIndex(mode, free, i, suggested, custom) { return mode === 'plain' ? -1 : mode === 'free' ? custom ? custom(i) : free[i] : suggested(i); }
  // These games rebuild their controls after a move. Keep keyboard focus inside
  // the activity, including when the card or door just used becomes disabled.
  function rememberFocus(host) {
    const active = typeof document === 'undefined' ? null : document.activeElement;
    if (!active || !host.contains(active)) return null;
    const keys = ['data-card', 'data-coin', 'data-coin-size', 'data-door', 'data-fox', 'data-fox-reveal', 'data-ant-cell', 'data-ants', 'data-ant-size'];
    const key = keys.find(name => active.hasAttribute(name));
    return key ? '[' + key + '="' + active.getAttribute(key) + '"]' : null;
  }
  function restoreFocus(host, selector, fallback) {
    if (!selector) return;
    const same = host.querySelector(selector);
    const next = same && !same.disabled ? same : host.querySelector(fallback);
    if (next) next.focus({preventScroll: true});
  }
  function applyPainterEvent(target, state, render) {
    const tool = target.closest('[data-pg-tool]');
    const swatch = target.closest('[data-pg-color]');
    if (tool) { state.paint = tool.dataset.pgTool === 'paint'; render(); return true; }
    if (swatch) { state.ink = Number(swatch.dataset.pgColor); state.paint = true; render(); return true; }
    if (target.closest('[data-pg-clear]')) { state.free.fill(-1); render(); return true; }
    return false;
  }

  W.coin = function (host, options) {
    const colors = options.colors, names = options.colorNames;
    const initialRows = {4: [12, 14, 9, 10], 8: [10, 14, 11, 12, 15, 13, 9, 7]};
    const s = {mode: options.mode || 'plain', paint: !options.painter, ink: 0, free: Array(4).fill(-1), values: initialRows[4].slice(), picks: []};
    host.classList.add('pg-games', 'pg-coin');
    function owners() { const a = Array(s.values.length).fill(-1); s.picks.forEach((p, k) => a[p] = k % 2); return a; }
    function render() {
      const focus = rememberFocus(host);
      const owned = owners(), remaining = owned.map((p, i) => p < 0 ? i : -1).filter(i => i >= 0);
      const first = remaining[0], last = remaining[remaining.length - 1], turn = s.picks.length % 2;
      const totals = [0, 0]; owned.forEach((p, i) => { if (p >= 0) totals[p] += s.values[i]; });
      const done = !remaining.length;
      const paints = s.values.map((_, i) => colorIndex(s.mode, s.free, i, j => j % 2, options.painter && (j => options.painter.color(j))));
      let message = done ? (totals[0] === totals[1] ? 'תיקו! לכל שחקן ' + totals[0] + ' נקודות.' : 'שחקן ' + (totals[0] > totals[1] ? '1' : '2') + ' ניצח.') : 'תור שחקן ' + (turn + 1) + ' · בחרו קלף מאחד הקצוות.';
      if (s.mode === 'free' && s.paint) message = 'בחרו צבע ולחצו על קלפים. גם קלפים שכבר נאספו שומרים על מקומם המקורי.';
      host.innerHTML = '<div class="tool-row pg-actions"><label class="pg-size-label">מספר קלפים <select data-coin-size aria-label="מספר הקלפים"><option value="4" ' + (s.values.length === 4 ? 'selected' : '') + '>4</option><option value="8" ' + (s.values.length === 8 ? 'selected' : '') + '>8</option></select></label><button type="button" class="btn secondary" data-coin="undo" ' + (!s.picks.length ? 'disabled' : '') + '>צעד אחורה</button><button type="button" class="btn secondary" data-coin="reset">משחק מחדש</button><button type="button" class="btn secondary" data-coin="random">שורה אקראית</button></div>' +
        painter(s.mode, s.paint, s.ink, colors, names, options.painter) +
        '<div class="pg-scoreboard">' + [0, 1].map(p => '<div class="pg-player ' + (!done && turn === p ? 'pg-current' : '') + '"><span>שחקן ' + (p + 1) + '</span><strong>' + totals[p] + '</strong><div class="pg-collected" dir="ltr">' + (s.picks.filter((_, k) => k % 2 === p).map(i => s.values[i]).join(' + ') || '-') + '</div></div>').join('') + '</div>' +
        '<div class="pg-card-row" style="grid-template-columns:repeat(' + s.values.length + ',minmax(0,1fr));max-width:' + (s.values.length === 4 ? '460' : '780') + 'px" dir="ltr" role="group" aria-label="שורת הקלפים, משמאל לימין">' + s.values.map((v, i) => {
          const paintEnabled = s.mode === 'free' && (options.painter ? options.painter.isPainting() : s.paint);
          const available = owned[i] < 0 && (i === first || i === last);
          return '<button type="button" class="pg-card ' + (owned[i] >= 0 ? 'pg-taken' : '') + (available ? ' pg-endpoint' : '') + '" data-card="' + i + '" style="--card-color:' + (paints[i] < 0 ? neutral : colors[paints[i]]) + '" ' + (!paintEnabled && !available ? 'disabled' : '') + ' aria-label="מקום ' + (i + 1) + ', המספר ' + v + (paints[i] < 0 ? '' : ', צבע ' + names[paints[i]]) + (owned[i] >= 0 ? ', נאסף על ידי שחקן ' + (owned[i] + 1) : available ? ', אפשר לבחור' : '') + '"><small class="pg-card-index">' + (i + 1) + '</small><span class="pg-card-value">' + v + '</span><span class="pg-card-owner">' + (owned[i] < 0 ? (available ? 'בחרו' : '') : 'שחקן ' + (owned[i] + 1)) + '</span></button>';
        }).join('') + '</div>' +
        '<p class="widget-note pg-note">מספרי המקומות הקטנים נשארים קבועים. הקלפים שנאספו מסומנים בתוך השורה.</p>' +
        (s.mode !== 'plain' ? colorStats(paints, s.values, colors, names) : '') + '<p class="live-status pg-status" role="status" aria-live="polite">' + message + '</p>';
      restoreFocus(host, focus, done ? '[data-coin="undo"]' : '[data-card]:not(:disabled)');
    }
    function reset() { s.picks = []; render(); }
    host.addEventListener('click', e => {
      if (applyPainterEvent(e.target, s, render)) return;
      const action = e.target.closest('[data-coin]');
      if (action) {
        if (action.dataset.coin === 'undo') s.picks.pop();
        if (action.dataset.coin === 'reset') s.picks = [];
        if (action.dataset.coin === 'random') { s.values = Array.from({length: s.values.length}, () => 1 + Math.floor(Math.random() * 30)); s.picks = []; }
        render(); return;
      }
      const card = e.target.closest('[data-card]'); if (!card) return;
      const i = Number(card.dataset.card);
      if (s.mode === 'free' && s.paint) { s.free[i] = s.ink; render(); return; }
      const own = owners(), rem = own.map((x, j) => x < 0 ? j : -1).filter(j => j >= 0);
      if (rem.length && (i === rem[0] || i === rem[rem.length - 1])) { s.picks.push(i); render(); }
    });
    host.addEventListener('change', e => {
      if (!e.target.matches('[data-coin-size]')) return;
      const size = Number(e.target.value);
      if (!initialRows[size]) return;
      s.values = initialRows[size].slice(); s.free = Array(size).fill(-1); reset();
    });
    render();
    return {setMode(mode) { s.mode = mode; render(); }, repaint: render, reset, getState() { return {mode: s.mode, values: s.values.slice(), picks: s.picks.slice(), owners: owners(), freeColors: s.free.slice(), paint: s.paint}; }};
  };

  W.fox = function (host, options) {
    const colors = options.colors, names = options.colorNames;
    const s = {mode: options.mode || 'plain', paint: !options.painter, ink: 0, free: Array(5).fill(-1), history: [], reveal: false};
    host.classList.add('pg-games', 'pg-fox');
    function calculate() {
      let possible = [1, 2, 3, 4, 5], caught = false;
      const steps = [];
      for (const door of s.history) {
        const before = possible.slice(), survivors = possible.filter(x => x !== door);
        if (!survivors.length) { caught = true; possible = []; steps.push({door, before, survivors, next: [], caught: true}); break; }
        possible = Array.from(new Set(survivors.flatMap(x => [x - 1, x + 1].filter(y => y >= 1 && y <= 5)))).sort((a, b) => a - b);
        steps.push({door, before, survivors, next: possible.slice(), caught: false});
      }
      return {possible, caught, steps};
    }
    function render() {
      const focus = rememberFocus(host);
      const result = calculate(), paintEnabled = s.mode === 'free' && (options.painter ? options.painter.isPainting() : s.paint);
      const reveal = s.mode === 'suggested' && s.reveal;
      const lastDoor = s.history[s.history.length - 1];
      const day = result.caught ? s.history.length : s.history.length + 1;
      let message = result.caught ? 'נתפס בוודאות! אחרי ' + s.history.length + ' בדיקות לא נשאר שום מסלול בריחה חוקי.' : !s.history.length ? 'באיזו דלת תבחרו להתחיל?' : 'בדלת ' + lastDoor + ' השועל התחמק. לאחר הבדיקה הוא עבר לדלת סמוכה. בחרו את הבדיקה הבאה.';
      if (paintEnabled) message = 'צבעו את הדלתות כרצונכם. כדי לפתוח דלת עברו לכלי ״משחקים״.';
      host.innerHTML = '<div class="tool-row pg-actions"><button type="button" class="btn secondary" data-fox="undo" ' + (!s.history.length ? 'disabled' : '') + '>צעד אחורה</button><button type="button" class="btn secondary" data-fox="reset">משחק מחדש</button>' + (s.mode === 'suggested' ? '<label class="pg-check"><input type="checkbox" data-fox-reveal ' + (reveal ? 'checked' : '') + '>הצגת מקומות אפשריים</label>' : '') + '</div>' +
        painter(s.mode, s.paint, s.ink, colors, names, options.painter) +
        '<div class="pg-fox-day"><span>יום <strong>' + day + '</strong></span><span>' + s.history.length + ' בדיקות</span></div>' +
        '<div class="pg-door-row" dir="ltr" role="group" aria-label="חמש דלתות, משמאל לימין">' + [1, 2, 3, 4, 5].map(d => {
          const c = colorIndex(s.mode, s.free, d - 1, i => i % 2, options.painter && (i => options.painter.color(i))), candidate = result.possible.includes(d);
          const label = 'דלת ' + d + (c < 0 ? '' : ', צבע ' + names[c]) + (reveal && !result.caught ? candidate ? ', השועל עשוי להימצא כאן' : ', השועל אינו יכול להימצא כאן כרגע' : '');
          return '<button type="button" class="pg-door ' + (reveal && !result.caught ? candidate ? 'pg-possible' : 'pg-impossible' : '') + (result.caught && d === lastDoor ? ' pg-caught' : '') + '" data-door="' + d + '" style="--door-color:' + (c < 0 ? neutral : colors[c]) + '" aria-label="' + label + '" ' + (result.caught && !paintEnabled ? 'disabled' : '') + '><span class="pg-door-number">' + d + '</span><span class="pg-door-inset">' + (result.caught && d === lastDoor ? foxSVG : '<span class="pg-door-handle"></span>') + '</span><span class="pg-door-candidate">' + (reveal && !result.caught && candidate ? 'אולי כאן' : '') + '</span></button>';
        }).join('') + '</div>' +
        '<div class="pg-fox-history"><strong>הבדיקות שלכם:</strong><span dir="ltr">' + (s.history.join(' → ') || '-') + '</span></div>' +
        (reveal && !result.caught ? '<div class="pg-possibility-note">לפני הבדיקה הבאה השועל יכול להיות בדלתות <b dir="ltr">' + result.possible.join(', ') + '</b>.</div>' : '') +
        '<p class="live-status pg-status" role="status" aria-live="polite">' + message + '</p>' +
        '<p class="widget-note pg-note"><strong>שועל חכם:</strong> כל עוד קיים מסלול חוקי שמתחמק מכל הבדיקות שלכם, השועל מתחמק. בכל לילה הוא חייב לעבור לדלת סמוכה.</p>';
      restoreFocus(host, focus, '[data-fox="undo"]');
    }
    function reset() { s.history = []; render(); }
    host.addEventListener('click', e => {
      if (applyPainterEvent(e.target, s, render)) return;
      const action = e.target.closest('[data-fox]');
      if (action) { if (action.dataset.fox === 'undo') s.history.pop(); else s.history = []; render(); return; }
      const door = e.target.closest('[data-door]'); if (!door) return;
      const d = Number(door.dataset.door);
      if (s.mode === 'free' && s.paint) { s.free[d - 1] = s.ink; render(); return; }
      if (!calculate().caught) { s.history.push(d); render(); }
    });
    host.addEventListener('change', e => { if (s.mode === 'suggested' && e.target.matches('[data-fox-reveal]')) { s.reveal = e.target.checked; render(); } });
    render();
    return {setMode(mode) { s.mode = mode; if (mode !== 'suggested') s.reveal = false; render(); }, repaint: render, reset, getState() { return {mode: s.mode, history: s.history.slice(), freeColors: s.free.slice(), reveal: s.reveal, ...calculate()}; }};
  };

  W.ants = function (host, options) {
    const colors = options.colors, names = options.colorNames;
    const s = {mode: options.mode || 'plain', paint: !options.painter, ink: 0, free: Array(25).fill(-1), n: 5, targets: Array(25).fill(null), selected: null, phase: 'plan', note: '', history: []};
    let timer = null, raf = null;
    host.classList.add('pg-games', 'pg-ants');
    function neighbours(i) {
      const r = Math.floor(i / s.n), c = i % s.n;
      return [r > 0 ? i - s.n : -1, c < s.n - 1 ? i + 1 : -1, r < s.n - 1 ? i + s.n : -1, c > 0 ? i - 1 : -1].filter(j => j >= 0);
    }
    function counts() { const a = Array(s.n * s.n).fill(0); s.targets.forEach(i => { if (i !== null) a[i]++; }); return a; }
    function arrow(i, j) { return j === null ? '' : j === i - s.n ? '↑' : j === i + s.n ? '↓' : j === i - 1 ? '←' : '→'; }
    function stopAnimation() { if (timer !== null) clearTimeout(timer); if (raf !== null) cancelAnimationFrame(raf); timer = raf = null; }
    function focusAnt(i) {
      const cell = host.querySelector('[data-ant-cell="' + i + '"]');
      if (cell) cell.focus({preventScroll: true});
    }
    function setTarget(i, j) {
      if (!neighbours(i).includes(j)) return;
      s.history.push(s.targets.slice()); s.targets[i] = j; s.selected = null; s.note = ''; render(); focusAnt(i);
    }
    function render() {
      const focus = rememberFocus(host);
      const assigned = s.targets.filter(t => t !== null).length, paintEnabled = s.mode === 'free' && (options.painter ? options.painter.isPainting() : s.paint);
      const cells = Array.from({length: s.n * s.n}, (_, i) => i), occupancy = counts();
      const collisionCells = occupancy.filter(x => x > 1).length, emptyCells = occupancy.filter(x => x === 0).length;
      const painted = cells.map(i => colorIndex(s.mode, s.free, i, j => (Math.floor(j / s.n) + j % s.n) % 2, options.painter && (j => options.painter.color(Math.floor(j / s.n) + ',' + j % s.n))));
      let message = s.note || (s.phase === 'result' ? (collisionCells ? 'נמצאו ' + collisionCells + ' משבצות שאליהן הגיעו כמה נמלים, ו־' + emptyCells + ' משבצות ריקות. אפשר לשנות את הכיוונים ולנסות שוב.' : 'הצלחתם! בכל משבצת נחתה בדיוק נמלה אחת.') : s.selected === null ? 'בחרו נמלה, ואז לחצו על משבצת שכנה כדי לקבוע לאן תלך.' : 'בחרו אחת מהמשבצות המסומנות ליד הנמלה שבחרתם.');
      if (s.phase === 'moving') message = 'כל הנמלים זזות יחד…';
      if (paintEnabled) message = 'בחרו צבע ולחצו על משבצות. לחזרה לתכנון התנועה בחרו ״משחקים״.';
      host.innerHTML = '<div class="tool-row pg-actions"><label class="pg-size-label">גודל הלוח <select data-ant-size aria-label="גודל לוח הנמלים"><option value="4" ' + (s.n === 4 ? 'selected' : '') + '>4 × 4</option><option value="5" ' + (s.n === 5 ? 'selected' : '') + '>5 × 5</option></select></label><button type="button" class="btn secondary" data-ants="random" ' + (s.phase === 'moving' ? 'disabled' : '') + '>כיוונים אקראיים</button><button type="button" class="btn secondary" data-ants="undo" ' + (!s.history.length || s.phase !== 'plan' ? 'disabled' : '') + '>צעד אחורה</button><button type="button" class="btn secondary" data-ants="reset">ניקוי הכיוונים</button></div>' +
        painter(s.mode, s.paint, s.ink, colors, names, options.painter) +
        '<div class="pg-ant-top"><span><strong>' + assigned + '</strong> מתוך <strong>' + s.n * s.n + '</strong> כיוונים נקבעו</span>' +
        (s.phase === 'result' ? '<button type="button" class="btn" data-ants="edit">שינוי הכיוונים</button><button type="button" class="btn secondary" data-ants="replay">הפעלה חוזרת</button>' : '<button type="button" class="btn" data-ants="move" ' + (assigned !== s.n * s.n || s.phase === 'moving' ? 'disabled' : '') + '>כולן זזות!</button>') + '</div>' +
        '<div class="pg-ant-board-wrap"><div class="pg-ant-board" dir="ltr" style="--n:' + s.n + '" role="group" aria-label="לוח הנמלים">' + cells.map(i => {
          const selected = s.selected === i, targetable = s.selected !== null && neighbours(s.selected).includes(i);
          const c = painted[i], r = Math.floor(i / s.n), col = i % s.n;
          let label = 'שורה ' + (r + 1) + ', עמודה ' + (col + 1);
          if (c >= 0) label += ', צבע ' + names[c];
          if (s.phase === 'result') label += ', ' + occupancy[i] + ' נמלים';
          else if (s.targets[i] !== null) label += ', כיוון ' + ({'↑':'למעלה','↓':'למטה','←':'שמאלה','→':'ימינה'}[arrow(i, s.targets[i])]);
          return '<button type="button" class="pg-ant-cell ' + (selected ? 'pg-selected ' : '') + (targetable ? 'pg-targetable ' : '') + (s.phase === 'result' && occupancy[i] > 1 ? 'pg-collision ' : '') + '" style="--cell-color:' + (c < 0 ? neutral : colors[c]) + '" data-ant-cell="' + i + '" aria-label="' + label + '" ' + (s.phase !== 'plan' && !paintEnabled ? 'disabled' : '') + '>' +
            (s.phase === 'plan' ? '<span class="pg-ant-icon">' + antSVG + '</span><span class="pg-ant-arrow">' + arrow(i, s.targets[i]) + '</span>' : '<span class="pg-occupancy ' + (occupancy[i] > 1 ? 'pg-many' : '') + '">' + (s.phase === 'result' ? occupancy[i] === 0 ? '-' : occupancy[i] > 1 ? occupancy[i] : '' : '') + '</span>') + '</button>';
        }).join('') + '</div>' + (s.phase !== 'plan' ? '<div class="pg-ant-layer" aria-hidden="true">' + cells.map(i => {
          const dest = s.phase === 'moving' ? i : s.targets[i];
          return '<span class="pg-moving-ant" data-moving-ant="' + i + '" style="left:' + ((dest % s.n + .5) * 100 / s.n) + '%;top:' + ((Math.floor(dest / s.n) + .5) * 100 / s.n) + '%;--n:' + s.n + '">' + antSVG + '</span>';
        }).join('') + '</div>' : '') + '</div>' +
        (s.mode !== 'plain' ? colorStats(painted, null, colors, names) : '') +
        '<p class="live-status pg-status" role="status" aria-live="polite">' + message + '</p><p class="widget-note pg-note">מותר לשתי נמלים להחליף מקומות. בודקים את מספר הנמלים בכל משבצת רק בסיום התנועה. אפשר גם לבחור נמלה ולהשתמש בחצי המקלדת.</p>';
      restoreFocus(host, focus, '[data-ants="reset"]');
    }
    function move() {
      if (s.targets.some(t => t === null) || s.phase === 'moving') return;
      stopAnimation(); s.phase = 'moving'; s.selected = null; s.note = ''; render();
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          host.querySelectorAll('[data-moving-ant]').forEach(el => {
            const dest = s.targets[Number(el.dataset.movingAnt)];
            el.style.left = ((dest % s.n + .5) * 100 / s.n) + '%';
            el.style.top = ((Math.floor(dest / s.n) + .5) * 100 / s.n) + '%';
          });
          timer = setTimeout(() => { s.phase = 'result'; timer = null; render(); }, 780);
        });
      });
    }
    function reset() { stopAnimation(); s.targets = Array(s.n * s.n).fill(null); s.history = []; s.selected = null; s.phase = 'plan'; s.note = ''; render(); }
    host.addEventListener('click', e => {
      if (applyPainterEvent(e.target, s, render)) return;
      const action = e.target.closest('[data-ants]');
      if (action) {
        const a = action.dataset.ants;
        if (a === 'reset') { reset(); return; }
        if (a === 'move' || a === 'replay') { move(); return; }
        if (a === 'edit') { stopAnimation(); s.phase = 'plan'; s.selected = null; s.note = ''; }
        if (a === 'random') { stopAnimation(); s.history.push(s.targets.slice()); s.targets = s.targets.map((_, i) => { const ns = neighbours(i); return ns[Math.floor(Math.random() * ns.length)]; }); s.phase = 'plan'; s.selected = null; s.note = ''; }
        if (a === 'undo' && s.history.length) { s.targets = s.history.pop(); s.selected = null; }
        render(); return;
      }
      const cell = e.target.closest('[data-ant-cell]'); if (!cell) return;
      const i = Number(cell.dataset.antCell);
      if (s.mode === 'free' && s.paint) { s.free[i] = s.ink; render(); return; }
      if (s.phase !== 'plan') return;
      if (s.selected !== null && neighbours(s.selected).includes(i)) setTarget(s.selected, i);
      else { s.selected = s.selected === i ? null : i; s.note = ''; render(); focusAnt(i); }
    });
    host.addEventListener('keydown', e => {
      const cell = e.target.closest('[data-ant-cell]'); if (!cell || s.phase !== 'plan' || (s.mode === 'free' && s.paint)) return;
      const offsets = {ArrowUp: -s.n, ArrowDown: s.n, ArrowLeft: -1, ArrowRight: 1};
      if (!(e.key in offsets)) return;
      e.preventDefault(); const i = Number(cell.dataset.antCell); setTarget(i, i + offsets[e.key]);
    });
    host.addEventListener('change', e => { if (e.target.matches('[data-ant-size]')) { const n = Number(e.target.value); if (n !== 4 && n !== 5) return; s.n = n; s.free = Array(s.n * s.n).fill(-1); reset(); } });
    render();
    return {setMode(mode) { if (s.phase === 'moving') { stopAnimation(); s.phase = 'result'; } s.mode = mode; render(); }, repaint() { if (s.phase === 'moving') { stopAnimation(); s.phase = 'result'; } render(); }, reset, getState() { return {mode: s.mode, n: s.n, targets: s.targets.slice(), freeColors: s.free.slice(), selected: s.selected, phase: s.phase, occupancy: counts(), paint: s.paint}; }, dispose() { stopAnimation(); }};
  };
})();

