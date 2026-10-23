(function () {
  'use strict';
  window.Widgets = window.Widgets || {};
  window.Widgets.knight = function (host, options = {}) {
    const size = 5, total = size * size;
    const example = [0,7,4,13,24,17,20,11,18,21,10,1,8,19,22,15,6,3,14,23,16,5,12,9,2];
    const reducedMotion = () => Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let mode = options.mode, route = example.slice(0, 1), playing = false, timer = null, disposed = false;
    host.classList.add('knight-widget');
    host.innerHTML = `
      <div class="knight-board" role="group" aria-label="הדגמת מסלול פרש בלוח 5 על 5" dir="ltr">
        ${Array.from({length: total}, (_, cell) => `<div class="knight-cell" data-cell="${cell}" role="img"><span class="knight-step" aria-hidden="true"></span><span class="knight-piece" aria-hidden="true">♞</span></div>`).join('')}
        <svg class="knight-route" viewBox="0 0 500 500" aria-hidden="true"><polyline class="knight-route-edge"/><polyline class="knight-route-line"/></svg>
      </div>
      <div class="knight-controls">
        <div class="knight-actions"><button type="button" class="btn secondary" data-action="play">הפעלת האנימציה</button><button type="button" class="btn secondary" data-action="replay">הפעלה מחדש</button></div>
        <p class="knight-count">משבצות שבוקרו: <bdi><b data-count>1</b> / 25</bdi></p>
        <p class="knight-status live-status" role="status" aria-live="polite"></p>
      </div>`;
    const cells = [...host.querySelectorAll('[data-cell]')];
    const playButton = host.querySelector('[data-action="play"]');
    const replayButton = host.querySelector('[data-action="replay"]');
    const count = host.querySelector('[data-count]');
    const status = host.querySelector('.knight-status');
    const lines = [...host.querySelectorAll('polyline')];

    function render() {
      host.classList.toggle('knight-colored', mode === 'suggested');
      cells.forEach((cellElement, cell) => {
        const row = Math.floor(cell / size), column = cell % size;
        const step = route.indexOf(cell);
        const current = cell === route.at(-1);
        cellElement.classList.toggle('is-dark', (row + column) % 2 === 1);
        cellElement.classList.toggle('is-visited', step !== -1);
        cellElement.classList.toggle('is-start', cell === route[0]);
        cellElement.classList.toggle('is-current', current);
        cellElement.querySelector('.knight-step').textContent = step === -1 ? '' : String(step + 1);
        const label = [`שורה ${row + 1}, עמודה ${column + 1}`];
        if (mode === 'suggested') label.push((row + column) % 2 ? 'כהה' : 'בהירה');
        if (step !== -1) label.push(`משבצת ${step + 1} במסלול`);
        if (cell === route[0]) label.push('התחלה');
        if (current) label.push('הפרש כאן');
        cellElement.setAttribute('aria-label', label.join(', '));
      });
      const points = route.map(cell => `${(cell % size) * 100 + 50},${Math.floor(cell / size) * 100 + 50}`).join(' ');
      lines.forEach(line => line.setAttribute('points', points));
      count.textContent = String(route.length);
      const complete = route.length === total;
      playButton.disabled = complete || disposed;
      replayButton.disabled = disposed;
      playButton.textContent = complete ? 'האנימציה הסתיימה' : playing ? 'השהיה' : route.length === 1 ? 'הפעלת האנימציה' : 'המשך האנימציה';
      const message = complete ? 'המסלול הושלם: 25 משבצות, 24 קפיצות.' : playing ? 'האנימציה פועלת.' : route.length === 1 ? 'מוכנים לצפייה.' : 'האנימציה מושהית.';
      if (status.textContent !== message) status.textContent = message;
    }
    function clearTimer() {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    }
    function schedule() {
      clearTimer();
      if (disposed || !playing || route.length === total) return;
      timer = window.setTimeout(() => {
        timer = null;
        if (disposed || !playing) return;
        route.push(example[route.length]);
        if (route.length === total) playing = false;
        render();
        schedule();
      }, 550);
    }
    function togglePlay() {
      if (disposed || route.length === total) return;
      playing = !playing;
      render();
      schedule();
    }
    function restart(autoplay) {
      if (disposed) return;
      clearTimer();
      route = example.slice(0, 1);
      playing = autoplay;
      render();
      schedule();
    }
    function replay() { restart(true); }
    playButton.addEventListener('click', togglePlay);
    replayButton.addEventListener('click', replay);
    restart(!reducedMotion());
    return {
      setMode(next) { if (!disposed) { mode = next; render(); } },
      reset() { restart(!reducedMotion()); },
      getState() { return {mode, route: [...route], playing, closed: false, goal: 'open'}; },
      dispose() {
        if (disposed) return;
        disposed = true;
        playing = false;
        clearTimer();
        playButton.removeEventListener('click', togglePlay);
        replayButton.removeEventListener('click', replay);
        render();
      }
    };
  };
})();
