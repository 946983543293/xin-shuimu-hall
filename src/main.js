// 新水木馆 v2.5 · 3D 展示网页 — 主入口
import * as THREE from 'three';
import { OrbitControls } from '../lib/OrbitControls.js';
import { CSS2DRenderer } from '../lib/CSS2DRenderer.js';
import { CONFIG } from '../building.config.js';
import { createMaterials, applyTheme } from './theme.js';
import { buildBuilding } from './geometry.js';
import { initUI } from './ui.js';
import { initDemo, PRESETS } from './interaction.js';
import { initHotspots } from './hotspots.js';
import { initGuide } from './guide.js';
import { initP2 } from './p2.js';

const app = document.getElementById('app');

// ---------- 渲染器 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.id = 'labels';
app.appendChild(labelRenderer.domElement);

// ---------- 场景 / 相机 / 控制 ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(125, 85, 130);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 26, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.minDistance = 20;
controls.maxDistance = 420;

// ---------- 灯光 ----------
const hemi = new THREE.HemisphereLight(0xfff8ec, 0xd8d2c4, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2df, 1.6);
sun.position.set(60, 120, 80);
scene.add(sun);

// ---------- 材质 / 建楼 ----------
const mats = createMaterials();
const built = buildBuilding(scene, mats);

// ---------- 剖切平面（纵剖沿 z / 横剖沿 x，默认不启用）----------
renderer.localClippingEnabled = true;
const clipZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 11); // 保留 z > c
const clipX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 46); // 保留 x > c
built.sky.material.clippingPlanes = [];
built.ground.material.clippingPlanes = [];
built.grid.material.clippingPlanes = [];

// ---------- 状态 ----------
const state = {
  visible: new Set(),
  glass: 0.3,
  theme: 'light',
  lang: 'zh',
  labels: true,
};

// ---------- 主循环（阻尼需要持续渲染）----------
const clock = new THREE.Clock();
function render() {
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (ctx.demo) ctx.demo.update(dt);
  if (ctx.p2) ctx.p2.update(dt);
  controls.update();
  render();
}

// ---------- UI ----------
const ctx = { renderer, scene, camera, controls, mats, built, state, rerender: render, clip: { clipZ, clipX } };
ctx.applyTheme = (name) => applyTheme(name, { scene, mats, hemi, sun, ground: built.ground, grid: built.grid, sky: built.sky, built });
ctx.applyTheme('light');
ctx.demo = initDemo(ctx);
const ui = initUI(ctx);
const hotspots = initHotspots(ctx);
ctx.hotspots = hotspots;
ctx.guide = initGuide(ctx);
// 语言切换时同步刷新打开中的热点卡片与导引标签
const _refresh = ui.refreshTexts;
ui.refreshTexts = () => { _refresh(); hotspots.refresh(); ctx.guide.refresh(); if (ctx.p2) ctx.p2.refreshP2Texts(); };
document.getElementById('lang-btn').addEventListener('click', () => { hotspots.refresh(); ctx.guide.refresh(); if (ctx.p2) ctx.p2.refreshP2Texts(); });

// P2：全流程动画 / 生长动画 / 数据面板
ctx.p2 = initP2(ctx);
{
  const flowBtn = document.createElement('button');
  flowBtn.id = 'flow-btn';
  flowBtn.textContent = CONFIG.STRINGS.summonPlay[state.lang];
  flowBtn.addEventListener('click', () => {
    if (!ctx.p2) return;
    if (ctx.p2.isFlowPlaying()) { ctx.p2.stopFlow(); flowBtn.textContent = CONFIG.STRINGS.summonPlay[state.lang]; }
    else { ctx.p2.playFlow(); flowBtn.textContent = CONFIG.STRINGS.summonStop[state.lang]; }
  });
  ctx.onFlowEnd = () => { flowBtn.textContent = CONFIG.STRINGS.summonPlay[state.lang]; };
  document.body.appendChild(flowBtn);

  const growBtn = document.createElement('button');
  growBtn.id = 'grow-btn';
  growBtn.textContent = CONFIG.STRINGS.growthPlay[state.lang];
  growBtn.addEventListener('click', () => {
    if (!ctx.p2) return;
    if (ctx.p2.isGrowing()) { ctx.p2.stopGrowth(); ctx.p2.restoreAllCapsules(); growBtn.textContent = CONFIG.STRINGS.growthPlay[state.lang]; }
    else { ctx.p2.playGrowth(); growBtn.textContent = CONFIG.STRINGS.growthStop[state.lang]; }
  });
  ctx.onGrowthEnd = () => { growBtn.textContent = CONFIG.STRINGS.growthPlay[state.lang]; };
  document.body.appendChild(growBtn);

  const dataBtn = document.createElement('button');
  dataBtn.id = 'data-btn';
  dataBtn.textContent = CONFIG.STRINGS.dataBtn[state.lang];
  dataBtn.addEventListener('click', () => ctx.p2 && ctx.p2.showData());
  document.body.appendChild(dataBtn);
  // 生长按钮文案跟随语言
  const _rt2 = ui.refreshTexts;
  ui.refreshTexts = () => {
    _rt2();
    flowBtn.textContent = ctx.p2.isFlowPlaying() ? CONFIG.STRINGS.summonStop[state.lang] : CONFIG.STRINGS.summonPlay[state.lang];
    growBtn.textContent = ctx.p2.isGrowing() ? CONFIG.STRINGS.growthStop[state.lang] : CONFIG.STRINGS.growthPlay[state.lang];
    dataBtn.textContent = CONFIG.STRINGS.dataBtn[state.lang];
  };
  ctx.p2.refreshP2Texts(); // 初始文案
}

// ---------- URL 参数（便于测试与截图机位）：?theme=night&floors=F9,F10&glass=0.2&lang=en ----------
{
  const p = new URLSearchParams(location.search);
  if (p.get('theme')) ui.setTheme(p.get('theme'));
  if (p.get('glass')) ui.setGlass(parseFloat(p.get('glass')));
  if (p.get('floors')) {
    const want = new Set(p.get('floors').split(','));
    ui.setAll((id) => want.has(id));
  }
  if (p.get('lang') && p.get('lang') !== state.lang) document.getElementById('lang-btn').click();
  if (p.get('preset')) {
    if (p.get('snap') === '1') {
      // 调试/截图：瞬移到机位（跳过补间）
      const pr = PRESETS.find((x) => x.id === p.get('preset'));
      if (pr) { camera.position.set(...pr.pos); controls.target.set(...pr.tgt); }
    } else ctx.demo.flyTo(p.get('preset'));
  }
  if (p.get('beam') === '1') {
    ctx.demo.playBeam();
    // 调试/截图：确定性快进到 beamt 秒
    const bt = parseFloat(p.get('beamt') || '0');
    for (let i = 0; i < Math.round(bt * 10); i++) ctx.demo.update(0.1);
  }
  if (p.get('clipz')) ui.setClip('z', parseFloat(p.get('clipz')));
  if (p.get('clipx')) ui.setClip('x', parseFloat(p.get('clipx')));
  if (p.get('guide') === '1') ctx.guide.snapEnter(p.get('gzoom') || null);
  // P2 调试/演示参数
  if (p.get('flow') === '1') {
    ctx.p2.playFlow();
    const ft = parseFloat(p.get('flowt') || '0');
    for (let i = 0; i < Math.round(ft * 10); i++) ctx.p2.update(0.1);
  }
  if (p.get('grow') === '1') {
    ctx.p2.playGrowth();
    const gt = parseFloat(p.get('growt') || '0');
    for (let i = 0; i < Math.round(gt * 28); i++) ctx.p2.update(1 / 28);
  }
  if (p.get('data') === '1') ctx.p2.showData();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
