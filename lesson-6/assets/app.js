(function () {
  'use strict';
  const id = document.body.dataset.problem;
  const colors = ['#63c6ef', '#ffb77b', '#b6a4ed', '#8fdeb1'];
  const colorNames = ['כחול', 'כתום', 'סגול', 'ירוק'];
  const host = document.getElementById('widget-' + id);
  const announcer = document.getElementById('announcer');
  let controller = null, painter = null, mode = 'plain';
  const about = document.getElementById('about-dialog');
  const aboutButton = document.getElementById('about-button');
  aboutButton.setAttribute('aria-haspopup', 'dialog');
  aboutButton.setAttribute('aria-controls', 'about-dialog');
  try {
    painter = window.PisgaPainter.create(host, {id, colors, colorNames, onChange: () => { if (controller && controller.repaint) controller.repaint(); }});
    controller = window.Widgets[id](host, {mode, colors, colorNames, painter});
  } catch (error) {
    if (painter) painter.dispose();
    painter = null;
    host.innerHTML = '<p class="error-box">ההתנסות לא נטענה. נסו לרענן את הדף.</p>';
    document.querySelectorAll('[data-mode]').forEach(button => { button.disabled = true; });
    console.error(error);
  }
  function setMode(next) {
    if (!controller || !['plain', 'free', 'suggested'].includes(next)) return;
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
  aboutButton.addEventListener('click', () => about.showModal());
  document.getElementById('close-about').addEventListener('click', () => about.close());
  about.addEventListener('click', event => {
    if (event.target !== about) return;
    const rect = about.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) about.close();
  });
  window.addEventListener('pagehide', event => { if (!event.persisted) { if (painter) painter.dispose(); if (controller && controller.dispose) controller.dispose(); } });
  window.PisgaApp = {setMode, getState: () => ({active:id, mode, painting:painter && painter.getState(), widget:controller && controller.getState()})};
})();

