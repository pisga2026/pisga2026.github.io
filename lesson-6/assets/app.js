(function () {
  'use strict';
  const id = document.body.dataset.problem;
  const colors = ['#63c6ef', '#ffb77b', '#b6a4ed', '#8fdeb1'];
  const colorNames = ['כחול', 'כתום', 'סגול', 'ירוק'];
  const host = document.getElementById('widget-' + id);
  const announcer = document.getElementById('announcer');
  let controller = null, mode = 'plain', hintUnlocked = false, unlockAttempt = 0;
  // Classroom hint gate. Each exercise has its own code; only digests are published.
  const hintDigests = {
  "domino": "f7a358b8e1946e636146c722435493ef810b7aeadbccc255e26a7d5adf28d917",
  "coin": "760fc343506463d4ce0b660952f1cc29b7f884110032e384d85edcb8c8c92ae0",
  "lamps": "eba02da5ba2dfdb139416653e0d63c12a3fe72959724970a1b8e0850ec417d70",
  "ants": "fde2d5b559e468ea8ba45d7ceb950f4060afe6adb8ecc559cb3fedde559d918a",
  "tetris": "1b30db7a154ee7c3ac08540eaaf6a3d3a1c30f5ffa1afb92ea66625cc853a069",
  "tromino": "3c14ee0de286566cb48459822ac93b5c245f7cd9ef2a09a9c2b1ce12842d5b3a",
  "knight": "a63e68c552371d3d8aefc2cbbe5dbd5bfb712b1e9a08a430688d20538d2fcbf9",
  "jumpers": "59079caa7de0006c64ce1932363d724fb5ca47e847c61cb056bd4043aa982fa5",
  "fox": "0fc570f3caf6fc5b90fbed79898bfc1fe18c21560aa56445eac750447e217475"
};
  const hintButton = document.querySelector('[data-mode="suggested"]');
  const hintDialog = document.createElement('dialog');
  hintDialog.id = 'hint-dialog';
  hintDialog.className = 'hint-dialog';
  hintDialog.setAttribute('aria-labelledby', 'hint-title');
  hintDialog.setAttribute('aria-describedby', 'hint-help');
  hintDialog.innerHTML = `
    <form id="hint-form">
      <div class="dialog-heading"><h2 id="hint-title">חשיפת הצביעה</h2><button class="secondary" type="button" data-hint-cancel aria-label="סגירה">×</button></div>
      <p class="hint-exercise-title"></p>
      <p id="hint-help">הצביעה תיפתח בעזרת הסיסמה לתרגיל הזה, כשהמורה יחליט שהגיע הזמן.</p>
      <label for="hint-password">סיסמה לתרגיל</label>
      <input id="hint-password" name="hint-password" type="password" inputmode="numeric" autocomplete="off" required maxlength="32" aria-describedby="hint-error" autofocus>
      <p id="hint-error" class="hint-error" role="alert"></p>
      <div class="hint-actions"><button class="btn" type="submit">חשיפת הצביעה</button><button class="btn secondary" type="button" data-hint-cancel>חזרה לתרגיל</button></div>
    </form>`;
  hintDialog.querySelector('.hint-exercise-title').textContent = document.getElementById('problem-title').textContent;
  document.body.append(hintDialog);
  const hintForm = hintDialog.querySelector('form');
  const hintPassword = hintDialog.querySelector('input');
  const hintError = hintDialog.querySelector('#hint-error');
  const hintSubmit = hintDialog.querySelector('[type="submit"]');
  hintButton.setAttribute('aria-haspopup', 'dialog');
  hintButton.setAttribute('aria-controls', host.id + ' hint-dialog');
  hintDialog.querySelectorAll('[data-hint-cancel]').forEach(button => button.addEventListener('click', () => hintDialog.close()));
  hintDialog.addEventListener('close', () => {
    unlockAttempt++;
    hintPassword.value = '';
    hintPassword.removeAttribute('aria-invalid');
    hintError.textContent = '';
    hintSubmit.disabled = false;
  });
  hintPassword.addEventListener('input', () => {
    hintPassword.removeAttribute('aria-invalid');
    hintError.textContent = '';
  });
  hintForm.addEventListener('submit', async event => {
    event.preventDefault();
    const attempt = ++unlockAttempt;
    const password = hintPassword.value.trim();
    hintSubmit.disabled = true;
    hintError.textContent = '';
    try {
      const bytes = new TextEncoder().encode('lesson-6:' + id + ':' + password);
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
      if (attempt !== unlockAttempt || !hintDialog.open) return;
      if (!hintDigests[id] || digest !== hintDigests[id]) {
        hintPassword.setAttribute('aria-invalid', 'true');
        hintError.textContent = 'הסיסמה אינה מתאימה לתרגיל הזה. נסו שוב.';
        hintPassword.focus();
        hintPassword.select();
        return;
      }
      hintUnlocked = true;
      hintButton.textContent = 'צביעה מוצעת';
      hintButton.removeAttribute('aria-haspopup');
      hintButton.setAttribute('aria-controls', host.id);
      hintDialog.close();
      setMode('suggested');
    } catch (_) {
      if (attempt === unlockAttempt && hintDialog.open) hintError.textContent = 'לא ניתן לבדוק את הסיסמה כרגע. נסו לרענן את הדף.';
    } finally {
      if (attempt === unlockAttempt) hintSubmit.disabled = false;
    }
  });
  const painter = window.PisgaPainter.create(host, {id, colors, colorNames, onChange: () => { if (controller && controller.repaint) controller.repaint(); }});
  try {
    controller = window.Widgets[id](host, {mode, colors, colorNames, painter});
  } catch (error) {
    host.innerHTML = '<p class="error-box">ההתנסות לא נטענה. נסו לרענן את הדף.</p>';
    console.error(error);
  }
  function setMode(next) {
    if (!controller || !['plain', 'free', 'suggested'].includes(next)) return;
    if (next === 'suggested' && !hintUnlocked) {
      if (!hintDialog.open) hintDialog.showModal();
      hintPassword.focus();
      return;
    }
    if (hintDialog.open) hintDialog.close();
    mode = next;
    painter.setMode(mode);
    controller.setMode(mode);
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    announcer.textContent = mode === 'plain' ? 'הצביעה מוסתרת.' : mode === 'free' ? 'הצביעה העצמית מוצגת.' : 'הצביעה המוצעת מוצגת.';
    document.body.classList.toggle('hint-visible', mode === 'suggested');
  }
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  const full = document.getElementById('full-screen');
  if (!document.documentElement.requestFullscreen) full.hidden = true;
  full.addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch (_) { announcer.textContent = 'אפשר להגדיל את חלון הדפדפן ידנית.'; }
  });
  document.addEventListener('fullscreenchange', () => {
    const isFull = Boolean(document.fullscreenElement);
    full.setAttribute('aria-pressed', String(isFull)); full.textContent = isFull ? 'יציאה ממסך מלא' : 'מסך מלא';
  });
  const about = document.getElementById('about-dialog');
  document.getElementById('about-button').addEventListener('click', () => about.showModal());
  document.getElementById('close-about').addEventListener('click', () => about.close());
  about.addEventListener('click', event => {
    if (event.target !== about) return;
    const rect = about.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) about.close();
  });
  window.addEventListener('pagehide', event => { if (!event.persisted) { painter.dispose(); if (controller && controller.dispose) controller.dispose(); } });
  window.PisgaApp = {setMode, getState: () => ({active:id, mode, painting:painter.getState(), widget:controller && controller.getState()})};
})();

