(function () {
  'use strict';
  window.Widgets = window.Widgets || {};
  window.Widgets.knight = function (host, options = {}) {
    const size = 5, total = size * size;
    let mode = options.mode, route = [], closed = false, disposed = false, focused = 0;
    host.classList.add('knight-widget');
    host.innerHTML = `
      <div class="knight-board" role="group" aria-label="בניית מסלול פרש סגור בלוח 5 על 5" dir="ltr">
        ${Array.from({length: total}, (_, cell) => `<button type="button" class="knight-cell" data-cell="${cell}" tabindex="${cell === 0 ? 0 : -1}"><span class="knight-step" aria-hidden="true"></span><span class="knight-piece" aria-hidden="true">♞</span><span class="knight-possible" aria-hidden="true"></span></button>`).join('')}
        <svg class="knight-route" viewBox="0 0 500 500" aria-hidden="true"><polyline class="knight-route-edge"/><polyline class="knight-route-line"/></svg>
      </div>
      <div class="knight-controls">
        <div class="knight-actions"><button type="button" class="btn secondary" data-action="undo">צעד אחורה</button><button type="button" class="btn secondary" data-action="reset">התחלה מחדש</button></div>
        <p class="knight-count">משבצות שבוקרו: <bdi><b data-count>0</b> / 25</bdi></p>
        <p class="knight-status live-status" role="status" aria-live="polite"></p>
      </div>`;
    const cells = [...host.querySelectorAll('[data-cell]')];
    const undoButton = host.querySelector('[data-action="undo"]');
    const resetButton = host.querySelector('[data-action="reset"]');
    const count = host.querySelector('[data-count]');
    const status = host.querySelector('.knight-status');
    const lines = [...host.querySelectorAll('polyline')];

    function legal(from, to) {
      return Math.abs(Math.floor(from / size) - Math.floor(to / size)) * Math.abs(from % size - to % size) === 2;
    }
    function available(cell) {
      if (!route.length || closed) return false;
      return legal(route.at(-1), cell) && (!route.includes(cell) || (route.length === total && cell === route[0]));
    }
    function render(message) {
      host.classList.toggle('knight-colored', mode === 'suggested');
      cells.forEach((cellElement, cell) => {
        const row = Math.floor(cell / size), column = cell % size;
        const step = route.indexOf(cell), current = cell === route.at(-1), possible = available(cell);
        cellElement.classList.toggle('is-dark', (row + column) % 2 === 1);
        cellElement.classList.toggle('is-visited', step !== -1);
        cellElement.classList.toggle('is-start', cell === route[0]);
        cellElement.classList.toggle('is-current', current);
        cellElement.classList.toggle('is-possible', possible);
        const custom = mode === 'free' && options.painter ? options.painter.color(cell) : -1;
        if (mode === 'free') cellElement.style.background = custom < 0 ? '#fff4d4' : options.colors[custom]; else cellElement.style.removeProperty('background');
        cellElement.disabled = disposed;
        cellElement.setAttribute('tabindex', cell === focused ? '0' : '-1');
        cellElement.querySelector('.knight-step').textContent = step === -1 ? '' : String(step + 1);
        const label = [`שורה ${row + 1}, עמודה ${column + 1}`];
        if (custom >= 0) label.push('צבע ' + options.colorNames[custom]);
        if (mode === 'suggested') label.push((row + column) % 2 ? 'כהה' : 'בהירה');
        if (step !== -1) label.push(`משבצת ${step + 1} במסלול`);
        if (cell === route[0]) label.push('התחלה');
        if (current) label.push('הפרש כאן');
        if (possible) label.push('אפשר לקפוץ לכאן');
        cellElement.setAttribute('aria-label', label.join(', '));
      });
      const drawnRoute = closed ? [...route, route[0]] : route;
      const points = drawnRoute.map(cell => `${(cell % size) * 100 + 50},${Math.floor(cell / size) * 100 + 50}`).join(' ');
      lines.forEach(line => line.setAttribute('points', points));
      count.textContent = String(route.length);
      undoButton.disabled = disposed || route.length === 0;
      resetButton.disabled = disposed || route.length === 0;
      if (!message) {
        if (closed) message = 'המסלול נסגר.';
        else if (!route.length) message = 'לחצו על משבצת התחלה. הנקודות מסמנות קפיצות אפשריות.';
        else if (route.length === total) message = 'כל המשבצות בוקרו. לסגירת המסלול, חזרו להתחלה בקפיצת פרש.';
        else if (!cells.some((_, cell) => available(cell))) message = 'אין קפיצה למשבצת פנויה. אפשר לחזור צעד.';
        else message = 'בחרו משבצת מסומנת לקפיצה הבאה.';
      }
      if (status.textContent !== message) status.textContent = message;
    }
    function choose(cell) {
      if (disposed || closed) return;
      focused = cell;
      if (!route.length) route.push(cell);
      else if (cell === route[0] && route.length < total) {
        render('חוזרים להתחלה רק אחרי ביקור בכל 25 המשבצות.');
        return;
      } else if (route.includes(cell) && cell !== route[0]) {
        render('במשבצת הזאת כבר ביקרתם.');
        return;
      } else if (!legal(route.at(-1), cell)) {
        render('זו אינה קפיצת פרש.');
        return;
      } else if (cell === route[0]) closed = true;
      else route.push(cell);
      render();
    }
    function undo() {
      if (disposed || !route.length) return;
      if (closed) closed = false;
      else route.pop();
      render();
    }
    function reset() {
      if (disposed) return;
      route = [];
      closed = false;
      render();
    }
    function click(event) {
      const cellElement = event.target.closest('[data-cell]');
      if (cellElement && cells.includes(cellElement)) choose(Number(cellElement.dataset.cell));
    }
    function keydown(event) {
      const cellElement = event.target.closest('[data-cell]');
      if (disposed || !cellElement || !cells.includes(cellElement)) return;
      const cell = Number(cellElement.dataset.cell), row = Math.floor(cell / size), column = cell % size;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choose(cell);
        return;
      }
      let next = cell;
      if (event.key === 'ArrowLeft') next = row * size + Math.max(0, column - 1);
      else if (event.key === 'ArrowRight') next = row * size + Math.min(size - 1, column + 1);
      else if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * size + column;
      else if (event.key === 'ArrowDown') next = Math.min(size - 1, row + 1) * size + column;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = total - 1;
      else return;
      event.preventDefault();
      focused = next;
      cells.forEach((element, index) => element.setAttribute('tabindex', index === focused ? '0' : '-1'));
      cells[next].focus();
    }
    host.addEventListener('click', click);
    host.addEventListener('keydown', keydown);
    undoButton.addEventListener('click', undo);
    resetButton.addEventListener('click', reset);
    render();
    return {
      setMode(next) { if (!disposed) { mode = next; render(); } },
      reset,
      repaint:render,
      getState() { return {mode, route: [...route], closed, goal: 'closed'}; },
      dispose() {
        if (disposed) return;
        disposed = true;
        host.removeEventListener('click', click);
        host.removeEventListener('keydown', keydown);
        undoButton.removeEventListener('click', undo);
        resetButton.removeEventListener('click', reset);
        render();
      }
    };
  };
})();

