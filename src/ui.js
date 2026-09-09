// 界面层：DOM 控制面板 / i18n / 截图导出
import { CONFIG } from '../building.config.js';

const S = CONFIG.STRINGS;

export function initUI(ctx) {
  const { state, built, mats, applyTheme, rerender } = ctx;

  // ---------- 面板骨架 ----------
  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.innerHTML = `
    <button id="panel-toggle" title="panel">☰</button>
    <div class="panel-body">
      <h2 data-i18n="panel"></h2>
      <section>
        <div class="sec-title" data-i18n="floors"></div>
        <div class="btn-row">
          <button class="mini" data-act="all" data-i18n="floorsAll"></button>
          <button class="mini" data-act="above" data-i18n="floorsAbove"></button>
          <button class="mini" data-act="none" data-i18n="floorsNone"></button>
        </div>
        <div class="floor-grid" id="floor-grid"></div>
      </section>
      <section>
        <div class="sec-title"><span data-i18n="glass"></span><span class="val" id="glass-val"></span></div>
        <input type="range" id="glass-range" min="0" max="100" value="${state.glass * 100}">
        <label class="check"><input type="checkbox" id="labels-check" checked> <span data-i18n="labels"></span></label>
      </section>
      <section>
        <div class="sec-title" data-i18n="secClip"></div>
        <label class="check"><input type="checkbox" id="clipz-on"> <span data-i18n="clipZ"></span></label>
        <input type="range" id="clipz-range" min="-10.5" max="10.5" step="0.1" value="0">
        <label class="check"><input type="checkbox" id="clipx-on"> <span data-i18n="clipX"></span></label>
        <input type="range" id="clipx-range" min="-45" max="45" step="0.1" value="0">
      </section>
      <section>
        <div class="sec-title" data-i18n="theme"></div>
        <div class="btn-row">
          <button class="mini theme-btn active" data-theme="light" data-i18n="themeLight"></button>
          <button class="mini theme-btn" data-theme="night" data-i18n="themeNight"></button>
        </div>
      </section>
      <section>
        <div class="sec-title" data-i18n="secDemo"></div>
        <div class="preset-grid">
          <button class="mini preset" data-preset="presetAerial" data-i18n="presetAerial"></button>
          <button class="mini preset" data-preset="presetSouth" data-i18n="presetSouth"></button>
          <button class="mini preset" data-preset="presetSection" data-i18n="presetSection"></button>
          <button class="mini preset" data-preset="presetFloor" data-i18n="presetFloor"></button>
          <button class="mini preset" data-preset="presetPodium" data-i18n="presetPodium"></button>
        </div>
        <button id="beam-btn" data-i18n="beamPlay"></button>
        <button id="guide-btn" data-i18n="guideMode"></button>
      </section>
      <section>
        <div class="sec-title" data-i18n="legend"></div>
        <div class="legend" id="legend"></div>
      </section>
      <button id="shot" data-i18n="shot"></button>
    </div>`;
  document.body.appendChild(panel);

  // 语言切换按钮（顶栏）
  const langBtn = document.createElement('button');
  langBtn.id = 'lang-btn';
  document.body.appendChild(langBtn);

  // ---------- 楼层 chips ----------
  const grid = panel.querySelector('#floor-grid');
  const order = ['B2', 'B1', 'F1', 'F2', ...Array.from({ length: 16 }, (_, i) => 'F' + (i + 3))];
  const chipText = (id) => (id.startsWith('F') ? id.slice(1) + 'F' : id);
  const chips = new Map();
  for (const id of order) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = chipText(id);
    b.dataset.id = id;
    b.addEventListener('click', () => setLevelVisible(id, !state.visible.has(id)));
    grid.appendChild(b);
    chips.set(id, b);
  }

  function setLevelVisible(id, vis) {
    if (vis) state.visible.add(id); else state.visible.delete(id);
    const lv = built.levels.get(id);
    if (lv) lv.group.visible = vis;
    const lb = built.labels.find((l) => l.id === id);
    if (lb) lb.obj.visible = vis && state.labels;
    chips.get(id).classList.toggle('active', vis);
    syncGround();
    rerender();
  }
  function setAll(pred) {
    for (const id of order) setLevelVisible(id, pred(id));
  }
  function syncGround() {
    const basementOn = state.visible.has('B1') || state.visible.has('B2');
    built.ground.visible = !basementOn;
    built.grid.visible = !basementOn;
    if (built.site) built.site.visible = !basementOn;
  }

  panel.querySelector('[data-act="all"]').addEventListener('click', () => setAll(() => true));
  panel.querySelector('[data-act="above"]').addEventListener('click', () => setAll((id) => !id.startsWith('B')));
  panel.querySelector('[data-act="none"]').addEventListener('click', () => setAll(() => false));

  // ---------- 幕墙透明度 ----------
  const range = panel.querySelector('#glass-range');
  const glassVal = panel.querySelector('#glass-val');
  function setGlass(v) {
    state.glass = v;
    range.value = Math.round(v * 100);
    mats.glass.opacity = v;
    glassVal.textContent = range.value + '%';
    rerender();
  }
  range.addEventListener('input', () => setGlass(range.value / 100));
  glassVal.textContent = range.value + '%';

  // ---------- 标注开关 ----------
  panel.querySelector('#labels-check').addEventListener('change', (e) => {
    state.labels = e.target.checked;
    for (const l of built.labels) l.obj.visible = state.labels && state.visible.has(l.id);
    rerender();
  });

  // ---------- 主题 ----------
  function setTheme(name) {
    state.theme = name;
    panel.querySelectorAll('.theme-btn').forEach((x) => x.classList.toggle('active', x.dataset.theme === name));
    applyTheme(name);
    rerender();
  }
  panel.querySelectorAll('.theme-btn').forEach((b) =>
    b.addEventListener('click', () => setTheme(b.dataset.theme))
  );

  // ---------- 剖切 ----------
  const clipState = { zOn: false, xOn: false, z: 0, x: 0 };
  function applyClip() {
    const planes = [];
    if (clipState.zOn) { ctx.clip.clipZ.constant = clipState.z; planes.push(ctx.clip.clipZ); }
    if (clipState.xOn) { ctx.clip.clipX.constant = clipState.x; planes.push(ctx.clip.clipX); }
    ctx.renderer.clippingPlanes = planes;
    rerender();
  }
  function setClip(axis, value) {
    const on = panel.querySelector('#clip' + axis + '-on');
    const rg = panel.querySelector('#clip' + axis + '-range');
    on.checked = true;
    rg.value = value;
    clipState[axis + 'On'] = true;
    clipState[axis] = value;
    applyClip();
  }
  for (const axis of ['z', 'x']) {
    panel.querySelector('#clip' + axis + '-on').addEventListener('change', (e) => {
      clipState[axis + 'On'] = e.target.checked;
      applyClip();
    });
    panel.querySelector('#clip' + axis + '-range').addEventListener('input', (e) => {
      clipState[axis] = parseFloat(e.target.value);
      if (!clipState[axis + 'On']) {
        panel.querySelector('#clip' + axis + '-on').checked = true;
        clipState[axis + 'On'] = true;
      }
      applyClip();
    });
  }

  // ---------- 演示：预设机位 + 横梁动画 ----------
  panel.querySelectorAll('.preset').forEach((b) =>
    b.addEventListener('click', () => ctx.demo && ctx.demo.flyTo(b.dataset.preset))
  );
  const beamBtn = panel.querySelector('#beam-btn');
  beamBtn.addEventListener('click', () => {
    if (!ctx.demo) return;
    if (ctx.demo.isPlaying()) { ctx.demo.stopBeam(); beamBtn.textContent = S.beamPlay[state.lang]; }
    else { ctx.demo.playBeam(); beamBtn.textContent = S.beamStop[state.lang]; }
  });
  ctx.onBeamEnd = () => { beamBtn.textContent = S.beamPlay[state.lang]; };
  const guideBtn = panel.querySelector('#guide-btn');
  guideBtn.addEventListener('click', () => {
    if (!ctx.guide) return;
    if (ctx.guide.isOn()) { ctx.guide.exit(); guideBtn.textContent = S.guideMode[state.lang]; }
    else { ctx.guide.enter(); guideBtn.textContent = S.guideExit[state.lang]; }
  });

  // ---------- 图例 ----------
  const legend = panel.querySelector('#legend');
  for (const [name, color] of Object.entries(CONFIG.programColors)) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<i style="background:${color}"></i><span data-prog="${name}"></span>`;
    legend.appendChild(item);
  }

  // ---------- 截图（高清 3200px）----------
  panel.querySelector('#shot').addEventListener('click', () => {
    const { renderer, scene, camera } = ctx;
    const w = 3200, h = Math.round(3200 * window.innerHeight / window.innerWidth);
    const ow = window.innerWidth, oh = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    renderer.domElement.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '新水木馆_' + Date.now() + '.png';
      a.click();
      URL.revokeObjectURL(a.href);
      renderer.setSize(ow, oh, false);
      camera.aspect = ow / oh; camera.updateProjectionMatrix();
      rerender();
    });
  });

  // ---------- 面板折叠 ----------
  panel.querySelector('#panel-toggle').addEventListener('click', () => panel.classList.toggle('closed'));

  // ---------- i18n ----------
  langBtn.addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    refreshTexts();
  });
  function refreshTexts() {
    const L = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.dataset.i18n;
      if (S[k]) el.textContent = S[k][L];
    });
    document.querySelectorAll('[data-prog]').forEach((el) => {
      const n = el.dataset.prog;
      el.textContent = L === 'zh' ? n : CONFIG.programEN[n] || n;
    });
    document.getElementById('t-title').innerHTML =
      L === 'zh' ? '新水木馆 · <span>插接书院</span>' : 'New Shuimu Hall · <span>Plug-in College</span>';
    document.getElementById('t-ver').textContent = S.version[L];
    document.getElementById('t-slogan').textContent = S.slogan[L];
    document.getElementById('t-hint').textContent = S.hint[L];
    document.getElementById('t-beam').textContent = S.beamNote[L];
    langBtn.textContent = S.langBtn[L];
  }

  // ---------- 初始状态 ----------
  setAll((id) => !id.startsWith('B')); // 默认地上全显、地下隐藏
  refreshTexts();
  return { refreshTexts, setLevelVisible, setAll, setTheme, setGlass, setClip, order };
}
