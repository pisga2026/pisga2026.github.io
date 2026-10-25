(function () {
  'use strict';
  const layouts = {
    domino: ['.tl-cell:not(.tl-hole-cell)', cell => cell.dataset.r + ',' + cell.dataset.c],
    tetris: ['.tl-cell:not(.tl-hole-cell)', cell => cell.dataset.r + ',' + cell.dataset.c],
    tromino: ['.tl-cell:not(.tl-hole-cell)', cell => cell.dataset.r + ',' + cell.dataset.c],
    ants: ['[data-ant-cell]', cell => { const n = Number(cell.closest('.pg-ant-board').style.getPropertyValue('--n')); const i = Number(cell.dataset.antCell); return Math.floor(i / n) + ',' + i % n; }],
    knight: ['[data-cell]', cell => cell.dataset.cell],
    jumpers: ['[data-jumper-cell]', cell => cell.dataset.jumperCell],
    lamps: ['[data-lamp]', cell => cell.dataset.lamp],
    coin: ['[data-card]', cell => cell.dataset.card],
    fox: ['[data-door]', cell => String(Number(cell.dataset.door) - 1)]
  };
  function create(host, options) {
    const [selector, keyOf] = layouts[options.id];
    const colors = options.colors, names = options.colorNames, marks = ['א', 'ב', 'ג', 'ד'];
    let mode = 'plain', tool = 'paint', brush = 0, ink = new Map(), history = [], stroke = null, pointer = null, lastPoint = null;
    const panel = document.createElement('section');
    panel.className = 'self-paint-panel';
    panel.setAttribute('aria-label', 'כלי צביעה עצמית');
    panel.hidden = true;
    panel.innerHTML = `<div class="self-paint-tools" role="group" aria-label="כלי עבודה"><button type="button" class="btn" data-paint-tool="paint" aria-pressed="true">צובעים</button><button type="button" class="btn secondary" data-paint-tool="play" aria-pressed="false">משחקים</button></div><div class="self-paint-colors" role="group" aria-label="בחירת צבע">${colors.map((color, i) => `<button type="button" class="self-paint-swatch" data-paint-color="${i}" style="--paint-color:${color}" aria-label="${names[i]}, סימן ${marks[i]}" aria-pressed="${i === 0}"><span aria-hidden="true">${marks[i]}</span> ${names[i]}</button>`).join('')}<button type="button" class="btn secondary" data-paint-color="-1" aria-pressed="false">מחק</button></div><div class="self-paint-actions"><button type="button" class="btn secondary" data-paint-undo disabled>ביטול צביעה</button><button type="button" class="btn secondary" data-paint-clear disabled>ניקוי צביעה</button></div><p class="self-paint-help" role="status" aria-live="polite"></p>`;
    host.before(panel);
    const help = panel.querySelector('.self-paint-help');
    function active() { return mode === 'free' && tool === 'paint'; }
    function color(key) { return ink.get(String(key)) ?? -1; }
    function remember(before) { history.push(before); if (history.length > 100) history.shift(); }
    function update() {
      panel.hidden = mode !== 'free';
      host.classList.toggle('is-self-painting', active());
      panel.querySelectorAll('[data-paint-tool]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.paintTool === tool)));
      panel.querySelectorAll('[data-paint-color]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.paintColor) === brush)));
      panel.querySelector('[data-paint-undo]').disabled = history.length === 0;
      panel.querySelector('[data-paint-clear]').disabled = ink.size === 0;
      help.textContent = tool === 'paint' ? 'בחרו צבע וצבעו בלחיצה או בגרירה. כדי להמשיך בתרגיל, בחרו ״משחקים״. הצביעה נשמרת.' : 'המשיכו בתרגיל עם הצביעה שלכם. אפשר לחזור לצביעה בכל רגע.';
    }
    function refresh() { options.onChange(); update(); }
    function finish() {
      if (stroke) { remember(stroke); stroke = null; }
      pointer = null; lastPoint = null;
      update();
    }
    function paint(key) {
      key = String(key);
      if (color(key) === brush) return false;
      if (!stroke) stroke = new Map(ink);
      if (brush < 0) ink.delete(key); else ink.set(key, brush);
      return true;
    }
    function cellAt(target) {
      const cell = target && target.closest ? target.closest(selector) : null;
      return cell && host.contains(cell) ? cell : null;
    }
    function focusKey(key) {
      const cell = Array.from(host.querySelectorAll(selector)).find(item => String(keyOf(item)) === String(key));
      if (cell) cell.focus({preventScroll:true});
    }
    function paintLine(from, to) {
      const steps = from ? Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 5)) : 1;
      let changed = false;
      for (let step = 1; step <= steps; step++) {
        const ratio = step / steps;
        const x = from ? from.x + (to.x - from.x) * ratio : to.x;
        const y = from ? from.y + (to.y - from.y) * ratio : to.y;
        const cell = cellAt(document.elementFromPoint(x, y));
        if (cell) changed = paint(keyOf(cell)) || changed;
      }
      if (changed) refresh();
    }
    function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
    function down(event) {
      if (!active() || (event.button !== undefined && event.button !== 0)) return;
      const cell = cellAt(event.target); if (!cell) return;
      stop(event);
      finish();
      pointer = event.pointerId;
      lastPoint = {x: event.clientX, y: event.clientY};
      if (host.setPointerCapture) host.setPointerCapture(pointer);
      if (paint(keyOf(cell))) refresh();
    }
    function move(event) {
      if (!active() || pointer === null || event.pointerId !== pointer) return;
      stop(event);
      const point = {x: event.clientX, y: event.clientY};
      paintLine(lastPoint, point);
      lastPoint = point;
    }
    function up(event) {
      if (pointer === null || event.pointerId !== pointer) return;
      stop(event);
      if (active() && event.type !== 'pointercancel') paintLine(lastPoint, {x: event.clientX, y: event.clientY});
      finish();
    }
    function click(event) {
      if (!active()) return;
      if (event.target.closest('[data-shape]')) { finish(); tool = 'play'; update(); return; }
      const cell = cellAt(event.target); if (!cell) return;
      stop(event);
      // Keyboard and accessibility activation have no pointer stroke.
      if (!event.detail) { const key = keyOf(cell); if (paint(key)) refresh(); finish(); focusKey(key); }
    }
    function undo() {
      finish();
      if (!history.length) return;
      ink = history.pop(); refresh();
    }
    function clear() {
      finish();
      if (!ink.size) return;
      remember(new Map(ink)); ink.clear(); refresh();
    }
    function setTool(next) { finish(); tool = next; refresh(); }
    panel.addEventListener('click', event => {
      const toolButton = event.target.closest('[data-paint-tool]');
      const swatch = event.target.closest('[data-paint-color]');
      if (toolButton) setTool(toolButton.dataset.paintTool);
      else if (swatch) { brush = Number(swatch.dataset.paintColor); setTool('paint'); }
      else if (event.target.closest('[data-paint-undo]')) undo();
      else if (event.target.closest('[data-paint-clear]')) clear();
    });
    function keydown(event) {
      if (mode === 'free' && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) { stop(event); undo(); }
      if (active() && (event.key === 'Enter' || event.key === ' ') && cellAt(event.target)) {
        const key = keyOf(cellAt(event.target)); stop(event); if (paint(key)) refresh(); finish(); focusKey(key);
      }
      if (active() && /^Arrow/.test(event.key) && cellAt(event.target)) {
        const cell = cellAt(event.target), cells = Array.from(host.querySelectorAll(selector));
        const index = cells.indexOf(cell), id = options.id;
        const columns = {domino:8, tetris:5, tromino:5, knight:5, jumpers:7, ants:id === 'ants' ? Number(cell.closest('.pg-ant-board').style.getPropertyValue('--n')) : 0}[id];
        stop(event);
        if (!columns) {
          const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
          focusKey(keyOf(cells[(index + delta + cells.length) % cells.length]));
        } else {
          const coordinates = String(keyOf(cell)).split(',').map(Number);
          let row = coordinates.length === 2 ? coordinates[0] : Math.floor(coordinates[0] / columns), column = coordinates.length === 2 ? coordinates[1] : coordinates[0] % columns;
          const dr = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0, dc = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
          row += dr; column += dc;
          if (row >= 0 && column >= 0 && column < columns) focusKey(coordinates.length === 2 ? row + ',' + column : row * columns + column);
        }
      }
    }
    const handlers = {pointerdown: down, pointermove: move, pointerup: up, pointercancel: up, click, keydown};
    Object.entries(handlers).forEach(([name, callback]) => host.addEventListener(name, callback, true));
    panel.addEventListener('keydown', keydown);
    update();
    return {
      color,
      isPainting:active,
      setMode(next) { finish(); mode = next; update(); },
      getState() { return {mode, tool, brush, colors: Object.fromEntries(ink), undoCount: history.length}; },
      dispose() { Object.entries(handlers).forEach(([name, callback]) => host.removeEventListener(name, callback, true)); panel.remove(); }
    };
  }
  window.PisgaPainter = {create};
})();
