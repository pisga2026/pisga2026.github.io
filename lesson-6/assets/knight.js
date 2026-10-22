(function () {
  'use strict';
  window.Widgets = window.Widgets || {};
  window.Widgets.knight = function (host, options) {
    const size = 5, total = size * size;
    let mode = options.mode, route = [], closed = false, goal = 'open';
    const example = [0,7,4,13,24,17,20,11,18,21,10,1,8,19,22,15,6,3,14,23,16,5,12,9,2];
    host.classList.add('knight-widget');
    host.innerHTML = `
      <div class="knight-board" role="group" aria-label="לוח 5 על 5 - מסלול הפרש" dir="ltr">
        ${Array.from({length: total}, (_, cell) => `<button type="button" class="knight-cell" data-cell="${cell}"><span class="knight-step" aria-hidden="true"></span><span class="knight-piece" aria-hidden="true">♞</span></button>`).join('')}
        <svg class="knight-route" viewBox="0 0 500 500" aria-hidden="true"><polyline class="knight-route-edge"/><polyline class="knight-route-line"/></svg>
      </div>
      <div class="knight-controls">
        <label class="variant-label">המשימה <select data-knight-goal aria-label="משימת הפרש"><option value="open">א · מסלול פתוח</option><option value="closed">ב · מוסיפים חזרה להתחלה</option></select></label>
        <div class="knight-actions"><button type="button" class="btn secondary" data-action="start">עזרה: התחלת מסלול</button><button type="button" class="btn secondary" data-action="example">הצגת מסלול פתוח לדוגמה</button></div>
        <div class="knight-actions"><button type="button" class="btn secondary" data-action="undo">ביטול צעד</button><button type="button" class="btn secondary" data-action="reset">איפוס</button></div>
        <p class="knight-count">משבצות שבוקרו: <bdi><b data-count>0</b> / 25</bdi></p>
        <p class="knight-status live-status" role="status" aria-live="polite"></p>
      </div>`;
    const cells = [...host.querySelectorAll('[data-cell]')];
    const undo = host.querySelector('[data-action="undo"]');
    const resetButton = host.querySelector('[data-action="reset"]');
    const count = host.querySelector('[data-count]');
    const status = host.querySelector('.knight-status');
    function isJump(from, to) {
      const dr = Math.abs(Math.floor(from / size) - Math.floor(to / size));
      const dc = Math.abs(from % size - to % size);
      return (dr === 1 && dc === 2) || (dr === 2 && dc === 1);
    }
    function canVisit(cell) {
      if (closed || (goal === 'open' && route.length === total)) return false;
      if (!route.length) return true;
      if (!isJump(route.at(-1), cell)) return false;
      return !route.includes(cell) || (route.length === total && cell === route[0]);
    }
    function render(message) {
      host.classList.toggle('knight-colored', mode === 'suggested');
      cells.forEach((button, cell) => {
        const row = Math.floor(cell / size), column = cell % size;
        const step = route.indexOf(cell);
        const current = route.length > 0 && cell === (closed ? route[0] : route.at(-1));
        button.classList.toggle('is-dark', (row + column) % 2 === 1);
        button.classList.toggle('is-visited', step !== -1);
        button.classList.toggle('is-start', route.length > 0 && cell === route[0]);
        button.classList.toggle('is-current', current);
        button.classList.toggle('is-next', route.length > 0 && canVisit(cell));
        button.querySelector('.knight-step').textContent = step === -1 ? '' : String(step + 1);
        const label = [`שורה ${row + 1}, עמודה ${column + 1}`];
        if (mode === 'suggested') label.push((row + column) % 2 ? 'כהה' : 'בהירה');
        if (step !== -1) label.push(`צעד ${step + 1}`);
        if (route.length && cell === route[0]) label.push('התחלה');
        if (current) label.push('הפרש כאן');
        if (route.length && canVisit(cell)) label.push('מהלך אפשרי');
        button.setAttribute('aria-label', label.join(', '));
      });
      const drawnRoute = closed ? route.concat(route[0]) : route;
      const points = drawnRoute.map(cell => `${(cell % size) * 100 + 50},${Math.floor(cell / size) * 100 + 50}`).join(' ');
      host.querySelectorAll('polyline').forEach(line => line.setAttribute('points', points));
      count.textContent = String(route.length);
      undo.disabled = resetButton.disabled = route.length === 0;
      status.textContent = message || (closed ? 'המסלול הושלם.' : !route.length ? 'בחרו משבצת התחלה.' : route.length === total ? goal === 'open' ? 'הצלחתם! ביקרתם ב־25 משבצות ב־24 קפיצות. כעת אפשר לעבור למשימה ב.' : 'ביקרתם בכל 25 המשבצות. האם אפשר להוסיף קפיצה חוקית להתחלה? האם מסלול אחר יעזור?' : 'בחרו את המשבצת הבאה.');
    }
    function visit(cell) {
      if (closed || (goal === 'open' && route.length === total)) return;
      if (route.length && cell === route[0] && route.length < total) {
        render('יש לבקר בכל המשבצות לפני החזרה להתחלה.');
      } else if (route.includes(cell) && cell !== route[0]) {
        render('המשבצת הזו כבר בוקרה.');
      } else if (!canVisit(cell)) {
        render('זו אינה קפיצת פרש.');
      } else {
        if (route.length === total && cell === route[0]) closed = true;
        else route.push(cell);
        render();
      }
    }
    cells.forEach((button, cell) => {
      button.addEventListener('click', () => visit(cell));
      button.addEventListener('keydown', event => {
        const row = Math.floor(cell / size), col = cell % size;
        const targets = {ArrowLeft: col > 0 ? cell - 1 : cell, ArrowRight: col < size - 1 ? cell + 1 : cell, ArrowUp: row > 0 ? cell - size : cell, ArrowDown: row < size - 1 ? cell + size : cell};
        if (!(event.key in targets)) return;
        event.preventDefault();
        cells[targets[event.key]].focus();
      });
    });
    undo.addEventListener('click', () => {
      if (closed) closed = false;
      else route.pop();
      render();
    });
    function reset() { route = []; closed = false; render(); }
    resetButton.addEventListener('click', reset);
    host.querySelector('[data-knight-goal]').addEventListener('change', event => { goal = event.target.value; closed = false; render(); });
    host.querySelector('[data-action="start"]').addEventListener('click', () => { route = example.slice(0, 6); closed = false; render('הנה שש המשבצות הראשונות. המשיכו את המסלול; אפשר גם לפתוח דוגמה מלאה.'); });
    host.querySelector('[data-action="example"]').addEventListener('click', () => { route = example.slice(); closed = false; render(); });
    render();
    return {
      setMode(next) { mode = next; render(); },
      reset,
      getState() { return {mode, route: [...route], closed, goal}; }
    };
  };
})();
