(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const WIDTH = 760, HEIGHT = 420, EPS = 1e-7;
  const RECT = [[0, 0], [WIDTH, 0], [WIDTH, HEIGHT], [0, HEIGHT]];
  function distance(line, point) { return line.a * point[0] + line.b * point[1] + line.c; }
  function makeLine(first, second) {
    let a = second[1] - first[1], b = first[0] - second[0];
    const length = Math.hypot(a, b);
    if (length < 5) return null;
    a /= length; b /= length;
    if (a < -EPS || (Math.abs(a) < EPS && b < 0)) { a = -a; b = -b; }
    return { a, b, c: -(a * first[0] + b * first[1]) };
  }
  function area(polygon) {
    return Math.abs(polygon.reduce((sum, point, i) => {
      const next = polygon[(i + 1) % polygon.length];
      return sum + point[0] * next[1] - point[1] * next[0];
    }, 0)) / 2;
  }
  function tidy(polygon) {
    const unique = polygon.filter((p, i) => {
      const prev = polygon[(i + polygon.length - 1) % polygon.length];
      return Math.hypot(p[0] - prev[0], p[1] - prev[1]) > EPS;
    });
    return unique.length >= 3 && area(unique) > 0.02 ? unique : [];
  }
  function clip(polygon, line, positive) {
    const output = [];
    if (!polygon.length) return output;
    for (let i = 0; i < polygon.length; i++) {
      const start = polygon[i], end = polygon[(i + 1) % polygon.length];
      const ds = distance(line, start) * (positive ? 1 : -1);
      const de = distance(line, end) * (positive ? 1 : -1);
      const startInside = ds >= -EPS, endInside = de >= -EPS;
      if (startInside) output.push(start);
      if (startInside !== endInside) {
        const t = ds / (ds - de);
        output.push([start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1])]);
      }
    }
    return tidy(output);
  }
  function makeRegions(lines) {
    let regions = [{ polygon: RECT.map(p => p.slice()), signature: '', freeColor: null }];
    lines.forEach(line => {
      const next = [];
      regions.forEach(region => {
        [false, true].forEach(positive => {
          const polygon = clip(region.polygon, line, positive);
          if (polygon.length) next.push({ polygon, signature: region.signature + (positive ? '1' : '0'), freeColor: null });
        });
      });
      regions = next;
    });
    return regions;
  }
  function center(polygon) {
    return polygon.reduce((s, p) => [s[0] + p[0] / polygon.length, s[1] + p[1] / polygon.length], [0, 0]);
  }
  function sharedEdge(first, second) {
    for (let i = 0; i < first.length; i++) {
      const a = first[i], b = first[(i + 1) % first.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 0.05) continue;
      const ux = (b[0] - a[0]) / length, uy = (b[1] - a[1]) / length;
      for (let j = 0; j < second.length; j++) {
        const c = second[j], d = second[(j + 1) % second.length];
        if (Math.abs((c[0] - a[0]) * uy - (c[1] - a[1]) * ux) > 1e-4 ||
            Math.abs((d[0] - a[0]) * uy - (d[1] - a[1]) * ux) > 1e-4) continue;
        const tc = (c[0] - a[0]) * ux + (c[1] - a[1]) * uy;
        const td = (d[0] - a[0]) * ux + (d[1] - a[1]) * uy;
        const lo = Math.max(0, Math.min(tc, td)), hi = Math.min(length, Math.max(tc, td));
        if (hi - lo > 0.05) return [[a[0] + lo * ux, a[1] + lo * uy], [a[0] + hi * ux, a[1] + hi * uy]];
      }
    }
    return null;
  }
  function adjacency(regions) {
    const edges = [];
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        const segment = sharedEdge(regions[i].polygon, regions[j].polygon);
        if (segment) edges.push({ first: i, second: j, segment });
      }
    }
    return edges;
  }
  function parity(signature) { return [...signature].reduce((sum, digit) => sum + Number(digit), 0) % 2; }
  function endpoints(line) {
    const hits = [];
    RECT.forEach((p, i) => {
      const q = RECT[(i + 1) % RECT.length], dp = distance(line, p), dq = distance(line, q);
      if (Math.abs(dp) < EPS) hits.push(p);
      if (dp * dq < -EPS) {
        const t = dp / (dp - dq);
        hits.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    });
    const unique = hits.filter((p, i) => !hits.slice(0, i).some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.001));
    return unique.length >= 2 ? [unique[0], unique[1]] : null;
  }
  function svgElement(name, attrs) {
    const element = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }
  const initialLines = () => [
    makeLine([170, 0], [260, 420]),
    makeLine([0, 110], [760, 270]),
    makeLine([0, 360], [760, 60]),
    makeLine([520, 0], [420, 420])
  ];

  window.Widgets = window.Widgets || {};
  window.Widgets.map = function (host, options) {
    const colors = options.colors, colorNames = options.colorNames;
    let mode = options.mode || 'plain', lines = initialLines(), regions = makeRegions(lines);
    let selectedColor = 0, tool = mode === 'free' ? 'paint' : 'line';
    let pending = null, pointerStart = null, preview = null, demo = null, showConflicts = false;
    let feedback = 'אפשר לשנות את המפה: גררו קו, או לחצו על שתי נקודות.';
    host.classList.add('map-widget');
    host.innerHTML = `
      <div class="tool-row map-toolbar">
        <button type="button" class="btn" data-map="line">＋ הוספת קו</button>
        <button type="button" class="btn secondary" data-map="random">קו אקראי</button>
        <button type="button" class="btn secondary" data-map="undo">ביטול קו אחרון</button>
        <button type="button" class="btn secondary" data-map="empty">דף ריק</button>
        <button type="button" class="btn secondary" data-map="reset">המפה המקורית</button>
      </div>
      <div class="paint-panel map-paint" hidden>
        <div class="tool-row">
          <button type="button" class="btn" data-map="paint">צביעת אזורים</button>
          <span class="map-palette-label">הצבע שלי:</span>
          <span class="map-swatches" role="group" aria-label="בחירת צבע"></span>
          <button type="button" class="btn secondary" data-map="erase">מחק</button>
          <button type="button" class="btn secondary" data-map="clear-colors">ניקוי צביעה</button>
          <button type="button" class="btn" data-map="check">בדיקת הצביעה</button>
        </div>
        <p class="widget-note map-paint-help">בחרו צבע ולחצו על אזור. שכנים לאורך קטע גבול צריכים להיות בצבעים שונים.</p>
      </div>
      <div class="map-paper-wrap">
        <svg class="map-paper" viewBox="-2 -2 764 424" role="group" aria-label="מפת אזורים. גררו קו או בחרו שתי נקודות להוספת קו."></svg>
      </div>
      <div class="stats-row map-stats"></div>
      <p class="live-status map-feedback" role="status" aria-live="polite"></p>
      <p class="widget-note map-footnote">כל קו נמשך עד שולי הדף. מגע בנקודה בלבד אינו נחשב גבול משותף.</p>`;
    const ui = {};
    host.querySelectorAll('[data-map]').forEach(element => { ui[element.dataset.map] = element; });
    const svg = host.querySelector('.map-paper');
    const paintPanel = host.querySelector('.map-paint');
    const stats = host.querySelector('.map-stats');
    const feedbackNode = host.querySelector('.map-feedback');
    const palette = host.querySelector('.map-swatches');
    colors.slice(0, 2).forEach((color, i) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'swatch map-swatch';
      button.style.setProperty('--swatch', color);
      button.setAttribute('aria-label', colorNames[i]); button.title = colorNames[i];
      button.addEventListener('click', () => { selectedColor = i; tool = 'paint'; pending = null; preview = null; showConflicts = false; render(); });
      palette.append(button);
    });

    function visibleState() {
      if (!demo) return { lines, regions };
      const visibleLines = lines.slice(0, demo.count);
      return { lines: visibleLines, regions: makeRegions(visibleLines) };
    }
    function displayedColor(region) {
      if (mode === 'plain') return null;
      if (mode === 'free') return region.freeColor;
      if (demo && demo.phase === 'split') return parity(region.signature.slice(0, -1));
      return parity(region.signature);
    }
    function report() {
      const visible = visibleState(), edges = adjacency(visible.regions);
      const unpainted = visible.regions.filter(region => displayedColor(region) === null).length;
      const conflicts = edges.filter(edge => {
        const first = displayedColor(visible.regions[edge.first]), second = displayedColor(visible.regions[edge.second]);
        return first !== null && first === second;
      });
      return { edges, unpainted, conflicts };
    }
    function draw() {
      const visible = visibleState();
      const layer = svgElement('g');
      visible.regions.forEach((region, index) => {
        const colorIndex = displayedColor(region);
        const polygon = svgElement('polygon', {
          points: region.polygon.map(p => p.join(',')).join(' '),
          fill: colorIndex === null ? '#effafa' : colors[colorIndex],
          stroke: '#15274b', 'stroke-width': 1.6, 'stroke-linejoin': 'round',
          class: 'map-region' + (mode === 'free' && tool === 'paint' ? ' map-region-paintable' : ''),
          'data-region': index,
          'aria-label': `אזור ${index + 1}, ${colorIndex === null ? 'ללא צבע' : colorNames[colorIndex]}`
        });
        if (mode === 'free' && tool === 'paint') {
          polygon.setAttribute('tabindex', '0'); polygon.setAttribute('role', 'button');
          const paint = () => {
            regions[index].freeColor = selectedColor;
            showConflicts = false;
            feedback = selectedColor === null ? `הצבע של אזור ${index + 1} נמחק.` : `אזור ${index + 1} נצבע ב${colorNames[selectedColor]}.`;
            render();
          };
          polygon.addEventListener('click', paint);
          polygon.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); paint(); svg.querySelector(`[data-region="${index}"]`)?.focus(); }
          });
        }
        layer.append(polygon);
      });
      if (demo && demo.phase === 'split') {
        const half = clip(RECT, lines[demo.count - 1], true);
        layer.append(svgElement('polygon', {
          points: half.map(p => p.join(',')).join(' '), fill: '#fff5bd', 'fill-opacity': 0.28,
          stroke: '#102641', 'stroke-width': 4, 'stroke-dasharray': '11 7', class: 'map-half-highlight', 'pointer-events': 'none'
        }));
      }
      visible.regions.forEach((region, index) => {
        if (area(region.polygon) < 1300) return;
        const point = center(region.polygon);
        const text = svgElement('text', {
          x: point[0], y: point[1] + 5, 'text-anchor': 'middle', class: 'map-region-number', 'pointer-events': 'none'
        });
        text.textContent = String(index + 1); layer.append(text);
      });
      if (showConflicts) report().conflicts.forEach(edge => {
        layer.append(svgElement('line', {
          x1: edge.segment[0][0], y1: edge.segment[0][1], x2: edge.segment[1][0], y2: edge.segment[1][1],
          stroke: '#a1283c', 'stroke-width': 6, 'stroke-dasharray': '9 5', 'pointer-events': 'none'
        }));
      });
      if (pending) layer.append(svgElement('circle', { cx: pending[0], cy: pending[1], r: 6, fill: '#15274b', stroke: '#fff', 'stroke-width': 2, 'pointer-events': 'none' }));
      if (preview) {
        const ends = endpoints(preview);
        if (ends) layer.append(svgElement('line', {
          x1: ends[0][0], y1: ends[0][1], x2: ends[1][0], y2: ends[1][1],
          stroke: '#a1283c', 'stroke-width': 3, 'stroke-dasharray': '9 6', 'pointer-events': 'none'
        }));
      }
      layer.append(svgElement('rect', { x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: 'none', stroke: '#15274b', 'stroke-width': 3, 'pointer-events': 'none' }));
      svg.replaceChildren(layer);
    }
    function render() {
      paintPanel.hidden = mode !== 'free';
      ui.paint.setAttribute('aria-pressed', String(tool === 'paint'));
      ui.line.setAttribute('aria-pressed', String(tool === 'line'));
      ui.erase.setAttribute('aria-pressed', String(selectedColor === null && tool === 'paint'));
      [...palette.children].forEach((button, i) => button.setAttribute('aria-pressed', String(selectedColor === i && tool === 'paint')));
      ['line', 'random', 'undo', 'empty', 'reset'].forEach(name => { ui[name].disabled = !!demo; });
      if (!demo) { ui.undo.disabled = lines.length === 0; ui.empty.disabled = lines.length === 0; ui.line.disabled = lines.length >= 12; ui.random.disabled = lines.length >= 12; }
      svg.classList.toggle('map-drawing', tool === 'line' && !demo);
      const visible = visibleState();
      stats.innerHTML = `<span class="stat">${visible.lines.length} קווים</span><span class="stat">${visible.regions.length} אזורים</span>`;
      if (mode !== 'plain') {
        const counts = [0, 0]; let blank = 0;
        visible.regions.forEach(region => { const color = displayedColor(region); if (color === null) blank++; else counts[color]++; });
        counts.forEach((count, i) => {
          const stat = document.createElement('span'); stat.className = 'stat map-color-stat';
          const chip = document.createElement('span'); chip.className = 'map-color-chip'; chip.style.background = colors[i];
          stat.append(chip, `${colorNames[i]}: ${count}`); stats.append(stat);
        });
        if (blank) { const stat = document.createElement('span'); stat.className = 'stat'; stat.textContent = `ללא צבע: ${blank}`; stats.append(stat); }
      }
      feedbackNode.textContent = feedback;
      draw();
    }
    function addLine(line) {
      if (!line) { feedback = 'בחרו שתי נקודות רחוקות מעט זו מזו.'; render(); return false; }
      if (lines.length >= 12) { feedback = 'הגעתם ל־12 קווים. אפשר לבטל קו או להתחיל בדף ריק.'; render(); return false; }
      const ds = RECT.map(p => distance(line, p));
      if (Math.min(...ds) > -0.5 || Math.max(...ds) < 0.5) { feedback = 'הקו צריך לחצות את פנים הדף.'; render(); return false; }
      if (lines.some(old => Math.abs(old.a - line.a) < 1e-5 && Math.abs(old.b - line.b) < 1e-5 && Math.abs(old.c - line.c) < 0.5)) {
        feedback = 'הקו הזה כבר נמצא במפה. נסו כיוון או מקום אחרים.'; render(); return false;
      }
      const previous = new Map(regions.map(region => [region.signature, region.freeColor]));
      lines.push(line); regions = makeRegions(lines);
      regions.forEach(region => { region.freeColor = previous.get(region.signature.slice(0, -1)) ?? null; });
      pending = null; preview = null; showConflicts = false;
      feedback = mode === 'free' ? 'נוסף קו. האזורים החדשים ירשו את הצבע הקודם; בדקו מה צריך לשנות.' : 'נוסף קו שחוצה את הדף מצד לצד.';
      render(); return true;
    }
    function reset() {
      lines = initialLines(); regions = makeRegions(lines); demo = null; pending = null; preview = null; pointerStart = null; showConflicts = false;
      tool = mode === 'free' ? 'paint' : 'line';
      feedback = mode === 'free' ? 'המפה המקורית חזרה. בחרו צבע והתחילו לצבוע.' : 'המפה המקורית חזרה. אפשר להוסיף קווים או לשנות את שלב ההתנסות.';
      render();
    }
    ui.line.addEventListener('click', () => { tool = 'line'; pending = null; preview = null; feedback = 'גררו קו על הדף, או לחצו על שתי נקודות. הקו יימשך עד השוליים.'; render(); });
    ui.paint.addEventListener('click', () => { tool = 'paint'; pending = null; preview = null; feedback = 'בחרו צבע ולחצו על אזור.'; render(); });
    ui.erase.addEventListener('click', () => { selectedColor = null; tool = 'paint'; pending = null; preview = null; feedback = 'לחצו על אזור כדי למחוק את צבעו.'; render(); });
    ui['clear-colors'].addEventListener('click', () => { regions.forEach(region => { region.freeColor = null; }); showConflicts = false; feedback = 'הצביעה החופשית נוקתה. הקווים נשארו.'; render(); });
    ui.check.addEventListener('click', () => {
      const result = report(); showConflicts = true;
      if (!result.unpainted && !result.conflicts.length) feedback = `הצלחתם! כל ${result.edges.length} הגבולות המשותפים מפרידים בין שני צבעים שונים.`;
      else feedback = `${result.unpainted ? `נותרו ${result.unpainted} אזורים ללא צבע. ` : ''}${result.conflicts.length ? `${result.conflicts.length} גבולות מפרידים בין אזורים באותו צבע; הם מסומנים בקו מקווקו.` : 'האזורים שצבעתם מתאימים זה לזה.'}`;
      render();
    });
    ui.random.addEventListener('click', () => {
      for (let attempt = 0; attempt < 15; attempt++) {
        const angle = Math.random() * Math.PI, cx = 140 + Math.random() * 480, cy = 80 + Math.random() * 260;
        if (addLine(makeLine([cx - Math.cos(angle) * 500, cy - Math.sin(angle) * 500], [cx + Math.cos(angle) * 500, cy + Math.sin(angle) * 500]))) break;
      }
    });
    ui.undo.addEventListener('click', () => {
      if (!lines.length) return;
      const children = new Map();
      regions.forEach(region => { const key = region.signature.slice(0, -1); if (!children.has(key)) children.set(key, []); children.get(key).push(region.freeColor); });
      lines.pop(); regions = makeRegions(lines);
      regions.forEach(region => { const inherited = children.get(region.signature) || []; region.freeColor = inherited.length && inherited.every(color => color === inherited[0]) ? inherited[0] : null; });
      pending = null; preview = null; showConflicts = false;
      feedback = 'הקו האחרון בוטל.';
      render();
    });
    ui.empty.addEventListener('click', () => { lines = []; regions = makeRegions(lines); pending = null; preview = null; showConflicts = false; tool = 'line'; feedback = 'דף חדש. גררו את הקו הראשון, או לחצו על שתי נקודות.'; render(); });
    ui.reset.addEventListener('click', reset);
    function pointFor(event) {
      const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
      const matrix = svg.getScreenCTM(); if (!matrix) return null;
      const result = point.matrixTransform(matrix.inverse());
      return [Math.max(0, Math.min(WIDTH, result.x)), Math.max(0, Math.min(HEIGHT, result.y))];
    }
    svg.addEventListener('pointerdown', event => {
      if (demo || tool !== 'line' || event.button > 0 || lines.length >= 12) return;
      event.preventDefault(); pointerStart = pointFor(event);
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove', event => {
      if (demo || tool !== 'line') return;
      const point = pointFor(event), origin = pointerStart || pending;
      if (origin && point) { preview = makeLine(origin, point); draw(); }
    });
    svg.addEventListener('pointerup', event => {
      if (!pointerStart || demo || tool !== 'line') return;
      const first = pointerStart, last = pointFor(event); pointerStart = null;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      if (!last) return;
      if (Math.hypot(last[0] - first[0], last[1] - first[1]) > 12) { pending = null; preview = null; addLine(makeLine(first, last)); }
      else if (pending) { const start = pending; pending = null; preview = null; addLine(makeLine(start, last)); }
      else { pending = last; preview = null; feedback = 'הנקודה הראשונה נבחרה. לחצו על נקודה שנייה, או בחרו שוב ״הוספת קו״ לביטול.'; render(); }
    });
    svg.addEventListener('pointercancel', () => { pointerStart = null; preview = null; draw(); });
    svg.addEventListener('pointerleave', () => { if (!pointerStart) { preview = null; draw(); } });
    render();
    return {
      setMode(next) {
        mode = next; demo = null; pending = null; preview = null; pointerStart = null; showConflicts = false; tool = mode === 'free' ? 'paint' : 'line';
        feedback = mode === 'free' ? 'בחרו אחד משני הצבעים וצבעו את האזורים. אפשר לבדוק את הצביעה בכל שלב.' : mode === 'suggested' ? 'המפה מוצגת בשני צבעים. אפשר להוסיף קווים.' : 'מפה ללא צביעה. אפשר להוסיף קווים ולחשוב כמה צבעים דרושים.';
        render();
      },
      reset,
      getState() {
        const visible = visibleState(), result = report();
        return {
          mode, tool, selectedColor, lines: lines.map(line => ({ ...line })), demo: demo ? { ...demo } : null,
          regions: visible.regions.map(region => ({ polygon: region.polygon.map(p => p.slice()), signature: region.signature, freeColor: region.freeColor, displayedColor: displayedColor(region) })),
          unpainted: result.unpainted, conflicts: result.conflicts.map(edge => [edge.first, edge.second]), adjacency: result.edges.map(edge => [edge.first, edge.second]),
          feedback
        };
      }
    };
  };
  window.Widgets.map.geometry = { makeLine, makeRegions, adjacency, parity, clip, area, initialLines, endpoints };
}());
