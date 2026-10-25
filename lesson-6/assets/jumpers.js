(function () {
  'use strict';
  const W = window.Widgets = window.Widgets || {};
  W.jumpers = function (host, options) {
    const size = 7;
    const colors = (options.colors || ['#a5edff', '#ffd19a', '#ffa294', '#60e99a']).slice(0, 4);
    const names = (options.colorNames || ['תכלת', 'כתום', 'ורוד', 'ירוק']).slice(0, 4);
    const marks = ['א', 'ב', 'ג', 'ד'];
    const initial = [16, 17, 23]; // (3,3), (3,4), (4,3), with rows counted from the top.
    const s = {mode: options.mode || 'plain', pieces: initial.slice(), selected: null, target: 32, history: [], free: Array(size * size).fill(-1), paint: !options.painter, ink: 0, note: ''};
    host.classList.add('jumpers-widget');
    function colorAt(cell) {
      if (s.mode === 'plain') return -1;
      return s.mode === 'free' ? options.painter ? options.painter.color(cell) : s.free[cell] : 2 * (Math.floor(cell / size) % 2) + cell % size % 2;
    }
    function legal(from, to) {
      if (!s.pieces.includes(from) || s.pieces.includes(to) || from === to || to < 0 || to >= size * size) return false;
      const dr = Math.floor(to / size) - Math.floor(from / size), dc = to % size - from % size;
      if (!((Math.abs(dr) === 2 && dc === 0) || (dr === 0 && Math.abs(dc) === 2) || (Math.abs(dr) === 2 && Math.abs(dc) === 2))) return false;
      return s.pieces.includes((from + to) / 2);
    }
    function moves(from) { return Array.from({length: size * size}, (_, i) => i).filter(i => legal(from, i)); }
    function coordinate(cell) { return '(' + (Math.floor(cell / size) + 1) + ',' + (cell % size + 1) + ')'; }
    function focusCell(cell) { const button = host.querySelector('[data-jumper-cell="' + cell + '"]'); if (button) button.focus({preventScroll: true}); }
    function render(focus) {
      const painting = s.mode === 'free' && (options.painter ? options.painter.isPainting() : s.paint), reached = s.pieces.includes(s.target);
      const destinations = s.selected === null ? [] : moves(s.selected);
      let message = s.note || (reached ? 'הגעתם לכוכב ב־' + s.history.length + ' קפיצות! אפשר לחזור להתחלה ולבדוק יעד אחר.' : s.selected === null ? 'בחרו כלי, ואז משבצת מסומנת לקפיצה.' : destinations.length ? 'בחרו אחת ממשבצות הנחיתה המסומנות.' : 'לכלי הזה אין כרגע קפיצה אפשרית. בחרו כלי אחר.');
      if (painting) message = 'בחרו צבע וצבעו משבצות. כדי לקפוץ בחרו ״משחקים״.';
      host.innerHTML = '<div class="tool-row jumpers-tools"><label class="jumpers-target-label">יעד <select data-jumper-target aria-label="בחירת יעד הקפיצות"><option value="32" ' + (s.target === 32 ? 'selected' : '') + '>א · יעד (5,5)</option><option value="24" ' + (s.target === 24 ? 'selected' : '') + '>ב · יעד (4,4)</option></select></label><button type="button" class="btn secondary" data-jumper-action="undo" ' + (!s.history.length ? 'disabled' : '') + '>צעד אחורה</button><button type="button" class="btn secondary" data-jumper-action="reset">חזרה להתחלה</button><span class="jumpers-count">קפיצות: <strong>' + s.history.length + '</strong></span></div>' +
        (s.mode === 'free' && !options.painter ? '<div class="paint-panel jumpers-painter"><div class="control-group" role="group" aria-label="כלי עבודה"><button type="button" class="btn" data-jumper-tool="paint" aria-pressed="' + s.paint + '">צובעים</button><button type="button" class="btn" data-jumper-tool="play" aria-pressed="' + !s.paint + '">משחקים</button></div><div class="control-group" role="group" aria-label="צבע למכחול">' + colors.map((color, i) => '<button type="button" class="jumpers-swatch" style="--swatch:' + color + '" data-jumper-color="' + i + '" aria-pressed="' + (s.ink === i) + '" aria-label="' + names[i] + ', סימן ' + marks[i] + '">' + marks[i] + '</button>').join('') + '<button type="button" class="btn secondary" data-jumper-color="-1" aria-pressed="' + (s.ink === -1) + '">מחק</button></div><button type="button" class="btn secondary" data-jumper-action="clear">ניקוי צביעה</button></div>' : '') +
        '<div class="jumpers-board-shell"><div class="jumpers-column-labels" dir="ltr" aria-hidden="true">' + Array.from({length: size}, (_, i) => '<span>' + (i + 1) + '</span>').join('') + '</div><div class="jumpers-board-row"><div class="jumpers-row-labels" aria-hidden="true">' + Array.from({length: size}, (_, i) => '<span>' + (i + 1) + '</span>').join('') + '</div><div class="jumpers-board" dir="ltr" role="group" aria-label="לוח קפיצות: 7 שורות ו־7 עמודות">' + Array.from({length: size * size}, (_, cell) => {
          const piece = s.pieces.indexOf(cell), color = colorAt(cell), target = cell === s.target;
          const label = 'שורה ' + (Math.floor(cell / size) + 1) + ', עמודה ' + (cell % size + 1) + (piece >= 0 ? ', כלי ' + (piece + 1) : ', משבצת ריקה') + (target ? ', יעד' : '') + (destinations.includes(cell) ? ', נחיתה אפשרית' : '') + (color >= 0 ? ', צבע ' + names[color] + ', סימן ' + marks[color] : '');
          return '<button type="button" class="jumpers-cell' + (s.selected === cell ? ' is-selected' : '') + (destinations.includes(cell) && !painting ? ' is-landing' : '') + (target ? ' is-target' : '') + '" data-jumper-cell="' + cell + '" style="--cell-color:' + (color < 0 ? '#edf7f5' : colors[color]) + '" aria-label="' + label + '"' + (piece >= 0 ? ' aria-pressed="' + (s.selected === cell) + '"' : '') + '>' + (color >= 0 ? '<span class="jumpers-color-mark" aria-hidden="true">' + marks[color] + '</span>' : '') + (target ? '<span class="jumpers-star' + (piece >= 0 ? ' has-piece' : '') + '" aria-hidden="true">★</span>' : '') + (piece >= 0 ? '<span class="jumpers-piece" aria-hidden="true">' + (piece + 1) + '</span>' : '') + '</button>';
        }).join('') + '</div></div></div>' +
        '<p class="widget-note jumpers-note">הקואורדינטות הן <bdi>(שורה, עמודה)</bdi>: שורות מלמעלה למטה, עמודות משמאל לימין. קופצים מעל כלי סמוך אל משבצת ריקה מיד אחריו, גם באלכסון. הכלי שדילגו מעליו נשאר במקומו.</p>' +
        (s.mode === 'suggested' ? '<div class="jumpers-legend" aria-label="מקרא צבעים">' + colors.map((color, i) => '<span><i style="background:' + color + '" aria-hidden="true">' + marks[i] + '</i>' + names[i] + '</span>').join('') + '</div>' : '') +
        '<p class="live-status' + (reached && !painting ? ' success' : '') + '" role="status" aria-live="polite">' + message + '</p><p class="widget-note">במקלדת: חצים למעבר בין משבצות, Enter או רווח לבחירה. החלפת היעד מחזירה את הכלים להתחלה.</p>';
      if (typeof focus === 'number') focusCell(focus);
    }
    function reset() { s.pieces = initial.slice(); s.selected = null; s.history = []; s.note = ''; render(); }
    function select(cell) {
      if (s.mode === 'free' && s.paint) { s.free[cell] = s.ink; render(cell); return; }
      s.note = '';
      if (s.pieces.includes(cell)) { s.selected = s.selected === cell ? null : cell; render(cell); return; }
      if (s.selected !== null && legal(s.selected, cell)) {
        const from = s.selected;
        s.history.push(s.pieces.slice());
        s.pieces[s.pieces.indexOf(from)] = cell; s.selected = null;
        s.note = s.pieces.includes(s.target) ? '' : 'קפיצה ' + s.history.length + ': מ־' + coordinate(from) + ' אל ' + coordinate(cell) + '. בחרו את הקפיצה הבאה.';
      } else s.note = s.selected === null ? 'בחרו תחילה אחד משלושת הכלים.' : 'כאן אי אפשר לנחות בקפיצה אחת. בחרו משבצת מסומנת או כלי אחר.';
      render(cell);
    }
    host.addEventListener('click', event => {
      const cell = event.target.closest('[data-jumper-cell]');
      if (cell) { select(Number(cell.dataset.jumperCell)); return; }
      const action = event.target.closest('[data-jumper-action]');
      if (action) {
        if (action.dataset.jumperAction === 'reset') { reset(); return; }
        if (action.dataset.jumperAction === 'undo' && s.history.length) { s.pieces = s.history.pop(); s.selected = null; s.note = ''; }
        if (action.dataset.jumperAction === 'clear') s.free.fill(-1);
        render(); return;
      }
      const tool = event.target.closest('[data-jumper-tool]');
      if (tool) { s.paint = tool.dataset.jumperTool === 'paint'; s.selected = null; s.note = ''; render(); return; }
      const swatch = event.target.closest('[data-jumper-color]');
      if (swatch) { s.ink = Number(swatch.dataset.jumperColor); s.paint = true; s.selected = null; render(); }
    });
    host.addEventListener('change', event => {
      if (!event.target.matches('[data-jumper-target]')) return;
      const target = Number(event.target.value);
      if (target === 32 || target === 24) { s.target = target; reset(); host.querySelector('[data-jumper-target]').focus(); }
    });
    host.addEventListener('keydown', event => {
      const cell = event.target.closest('[data-jumper-cell]'); if (!cell) return;
      const from = Number(cell.dataset.jumperCell), row = Math.floor(from / size), col = from % size;
      const directions = {ArrowLeft: col > 0 ? from - 1 : from, ArrowRight: col < size - 1 ? from + 1 : from, ArrowUp: row > 0 ? from - size : from, ArrowDown: row < size - 1 ? from + size : from};
      if (event.key in directions) { event.preventDefault(); focusCell(directions[event.key]); }
      if (event.key === 'Escape') { s.selected = null; s.note = ''; render(from); }
    });
    render();
    return {
      setMode(mode) { s.mode = mode; s.selected = null; s.note = ''; render(); },
      reset,
      repaint:render,
      getState() { return {mode: s.mode, size, pieces: s.pieces.slice(), target: s.target, selected: s.selected, moves: s.history.length, history: s.history.map(p => p.slice()), freeColors: s.free.slice(), paint: s.paint, reached: s.pieces.includes(s.target)}; }
    };
  };
})();

