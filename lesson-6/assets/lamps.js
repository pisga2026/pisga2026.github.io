(function () {
  'use strict';
  const W = window.Widgets = window.Widgets || {};
  W.lamps = function (host, options) {
    options = options || {};
    const size = 12;
    const colors = (options.colors || ['#63c6ef', '#ffb77b', '#b6a4ed', '#8fdeb1']).slice(0, 4);
    const names = (options.colorNames || ['כחול', 'כתום', 'סגול', 'ירוק']).slice(0, 4);
    const marks = ['א', 'ב', 'ג', 'ד'];
    const variants = {a: [0, 3], b: [0, 4]};
    const s = {mode: options.mode === 'suggested' ? 'suggested' : 'plain', variant: 'a', lit: [], history: []};
    let hovered = null, focused = null;

    function triple(center) { return [(center + size - 1) % size, center, (center + 1) % size]; }
    function initial() { return Array.from({length: size}, (_, i) => variants[s.variant].includes(i)); }
    function isCell(cell) { return Number.isInteger(cell) && cell >= 0 && cell < size; }
    function buttonOf(target) { return target && target.closest ? target.closest('[data-lamp]') : null; }
    function currentPreview() { return hovered === null ? focused : hovered; }
    function preview() {
      const center = options.painter && options.painter.isPainting() ? null : currentPreview();
      const cells = center === null ? [] : triple(center);
      lampButtons.forEach((button, i) => {
        button.classList.toggle('is-preview', cells.includes(i));
        button.classList.toggle('is-center', center === i);
      });
    }
    function render() {
      const painted = s.mode !== 'plain';
      const litCount = s.lit.filter(Boolean).length;
      host.classList.toggle('has-coloring', painted);
      host.classList.toggle('is-solved', litCount === 0);
      lampButtons.forEach((button, i) => {
        const on = s.lit[i], color = s.mode === 'suggested' ? i % 3 : s.mode === 'free' && options.painter ? options.painter.color(i) : -1;
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', String(on));
        button.setAttribute('aria-label', 'נורה ' + (i + 1) + ', ' + (on ? 'דולקת' : 'כבויה') + (color >= 0 ? ', צבע ' + names[color] + ', קבוצה ' + marks[color] : '') + '. לחיצה הופכת את נורות ' + triple(i).map(j => j + 1).join(', ') + '.');
        button.style.setProperty('--lamp-group', color >= 0 ? colors[color] : '#e8f1ee');
        button.querySelector('.lamps-color-mark').hidden = color < 0;
        button.querySelector('.lamps-color-mark').textContent = color < 0 ? '' : marks[color];
      });
      host.querySelector('[data-lamps-count]').textContent = litCount;
      host.querySelector('[data-lamps-moves]').textContent = s.history.length;
      host.querySelector('[data-lamps-action="undo"]').disabled = !s.history.length;
      host.querySelector('[data-lamps-legend]').hidden = s.mode !== 'suggested';
      const status = host.querySelector('[data-lamps-status]');
      status.classList.toggle('success', litCount === 0);
      status.textContent = litCount === 0 ? 'כל הנורות כבויות! הצלחתם ב-' + s.history.length + ' מהלכים.' : 'נסו לכבות את כל הנורות.';
      preview();
    }
    function reset() { s.lit = initial(); s.history = []; render(); }
    function move(center) {
      if (!isCell(center)) return;
      s.history.push({center, lit: s.lit.slice()});
      triple(center).forEach(i => { s.lit[i] = !s.lit[i]; });
      render();
    }

    host.classList.add('lamps-widget');
    host.innerHTML = '<div class="tool-row lamps-tools"><label class="lamps-variant-label">גרסה <select data-lamps-variant aria-label="בחירת גרסת משחק הנורות"><option value="a">א · נורות 1 ו-4 דולקות</option><option value="b">ב · נורות 1 ו-5 דולקות</option></select></label><button type="button" class="btn secondary" data-lamps-action="undo" disabled>צעד אחורה</button><button type="button" class="btn secondary" data-lamps-action="reset">חזרה להתחלה</button><span class="lamps-moves">מהלכים: <strong data-lamps-moves>0</strong></span></div>' +
      '<p class="widget-note lamps-instruction">לחצו על נורה כדי להפוך את מצבה ואת מצב שתי שכנותיה: דולקת נכבית וכבויה נדלקת.</p>' +
      '<div class="lamps-ring" role="group" aria-label="12 נורות במעגל, ממוספרות עם כיוון השעון"><div class="lamps-wire" aria-hidden="true"></div><div class="lamps-hub"><span>דולקות</span><strong data-lamps-count>2</strong><span>מתוך 12</span></div>' +
      Array.from({length: size}, (_, i) => {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const x = 50 + 40.5 * Math.cos(angle), y = 50 + 40.5 * Math.sin(angle);
        return '<button type="button" class="lamps-bulb" data-lamp="' + i + '" style="left:' + x.toFixed(3) + '%;top:' + y.toFixed(3) + '%"><span class="lamps-light" aria-hidden="true"><span class="lamps-filament"></span></span><span class="lamps-number" aria-hidden="true">' + (i + 1) + '</span><span class="lamps-color-mark" aria-hidden="true" hidden>' + marks[i % 3] + '</span></button>';
      }).join('') + '</div>' +
      '<div class="lamps-legend" data-lamps-legend aria-label="מקרא צבעים" hidden>' + colors.slice(0, 3).map((color, i) => '<span><i style="background:' + color + '" aria-hidden="true">' + marks[i] + '</i>' + names[i] + '</span>').join('') + '</div>' +
      '<p class="live-status lamps-status" data-lamps-status role="status" aria-live="polite"></p><p class="widget-note lamps-keyboard">במקלדת: חצים למעבר בין הנורות, Enter או רווח לביצוע מהלך. החלפת גרסה מחזירה את הנורות להתחלה.</p>';
    const lampButtons = Array.from(host.querySelectorAll('[data-lamp]'));

    function onClick(event) {
      const bulb = buttonOf(event.target);
      if (bulb) { move(Number(bulb.dataset.lamp)); return; }
      const action = event.target.closest('[data-lamps-action]');
      if (!action) return;
      if (action.dataset.lampsAction === 'reset') reset();
      if (action.dataset.lampsAction === 'undo' && s.history.length) {
        s.lit = s.history.pop().lit;
        render();
      }
    }
    function onChange(event) {
      if (!event.target.matches('[data-lamps-variant]') || !Object.prototype.hasOwnProperty.call(variants, event.target.value)) return;
      s.variant = event.target.value;
      hovered = null; focused = null;
      reset();
    }
    function onKeydown(event) {
      const bulb = buttonOf(event.target);
      if (!bulb) return;
      const from = Number(bulb.dataset.lamp);
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (from + 1) % size;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (from + size - 1) % size;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = size - 1;
      if (typeof next === 'number') {
        event.preventDefault();
        hovered = null;
        lampButtons[next].focus({preventScroll: true});
      }
    }
    function onPointerover(event) {
      if (event.pointerType === 'touch') return;
      const bulb = buttonOf(event.target);
      if (bulb) { hovered = Number(bulb.dataset.lamp); preview(); }
    }
    function onPointerout(event) {
      const bulb = buttonOf(event.target);
      if (!bulb || (event.relatedTarget && bulb.contains(event.relatedTarget))) return;
      hovered = null; preview();
    }
    function onFocusin(event) {
      const bulb = buttonOf(event.target);
      focused = bulb ? Number(bulb.dataset.lamp) : null;
      preview();
    }
    function onFocusout(event) {
      if (!buttonOf(event.target)) return;
      focused = null; preview();
    }
    const handlers = {click: onClick, change: onChange, keydown: onKeydown, pointerover: onPointerover, pointerout: onPointerout, focusin: onFocusin, focusout: onFocusout};
    Object.keys(handlers).forEach(name => host.addEventListener(name, handlers[name]));
    reset();
    return {
      setMode(mode) { if (['plain', 'free', 'suggested'].includes(mode)) { s.mode = mode; render(); } },
      reset,
      repaint:render,
      getState() {
        return {mode: s.mode, size, variant: s.variant, lit: s.lit.slice(), litPositions: s.lit.flatMap((on, i) => on ? [i + 1] : []), moves: s.history.length, history: s.history.map(step => ({center: step.center, lit: step.lit.slice()})), positionColors: s.lit.map((_, i) => s.mode === 'suggested' ? i % 3 : -1), preview: currentPreview(), solved: !s.lit.some(Boolean)};
      },
      dispose() { Object.keys(handlers).forEach(name => host.removeEventListener(name, handlers[name])); }
    };
  };
})();

