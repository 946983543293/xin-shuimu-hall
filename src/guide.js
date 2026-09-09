// 楼层导引：商场导览式 3D 分层——五块楼层板（B2/B1/1F/2F/标准层），板面贴精确平面图，点击放大
import * as THREE from 'three';
import { CSS2DObject } from '../lib/CSS2DRenderer.js';

// 图纸坐标系（1m=10px）：标准层画布 1500×1120，塔身轮廓 x=300–1200, y=300–510
// 公共层画布 1400×860，基座轮廓 x=170–1250, y=230–482
const UV_STD = [300 / 1500, 1 - 510 / 1120, (1200 - 300) / 1500, (510 - 300) / 1120];
const UV_POD = [170 / 1400, 1 - 482 / 860, (1250 - 170) / 1400, (482 - 230) / 860];

const PLATES = [
  { id: 'B2', tex: 'assets/plans/b2.png', w: 108, d: 25.2, y: 0, uv: UV_POD,
    name: { zh: 'B2 · 运动场馆层', en: 'B2 · Sports Hall' } },
  { id: 'B1', tex: 'assets/plans/b1.png', w: 108, d: 25.2, y: 9, uv: UV_POD,
    name: { zh: 'B1 · 舱体储运层', en: 'B1 · Capsule Logistics' } },
  { id: 'F1', tex: 'assets/plans/f1.png', w: 108, d: 25.2, y: 18, uv: UV_POD,
    name: { zh: '1F · 迎客层', en: '1F · Welcome' } },
  { id: 'F2', tex: 'assets/plans/f2.png', w: 108, d: 25.2, y: 27, uv: UV_POD,
    name: { zh: '2F · 科创与治理层', en: '2F · Maker & Governance' } },
  { id: 'STD', tex: 'assets/plans/std.png', w: 90, d: 21, y: 38, uv: UV_STD,
    name: { zh: '3F–18F · 标准住宿层（共 16 层）', en: '3F–18F · Residential (16 floors)' } },
];

const GUIDE_VIEW = { pos: [78, 62, 78], tgt: [0, 16, 0] };

export function initGuide(ctx) {
  const { scene, camera, controls, renderer, state, built } = ctx;

  const group = new THREE.Group();
  group.name = 'guide';
  group.visible = false;
  scene.add(group);

  // 楼层板
  const plateMat = new THREE.MeshLambertMaterial({ color: 0xfffdf8 });
  const loader = new THREE.TextureLoader();
  const hitMeshes = [];
  for (const p of PLATES) {
    const pg = new THREE.Group();
    pg.position.y = p.y;
    group.add(pg);
    const box = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.8, p.d), plateMat);
    box.userData.plate = p;
    box.add(new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), ctx.mats.edge));
    pg.add(box);
    hitMeshes.push(box);
    const tex = loader.load(p.tex);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(p.uv[2], p.uv[3]);
    tex.offset.set(p.uv[0], p.uv[1]);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(p.w, p.d),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.43;
    top.userData.plate = p;
    pg.add(top);
    hitMeshes.push(top);
    // 右侧名称标签
    const div = document.createElement('div');
    div.className = 'guide-label';
    const lo = new CSS2DObject(div);
    lo.position.set(p.w / 2 + 4, 0.4, 0);
    pg.add(lo);
    p._div = div;
    p._pg = pg;
    p._hit = [box, top];
  }

  // 提示条 + 返回按钮（DOM）
  const bar = document.createElement('div');
  bar.id = 'guide-bar';
  bar.style.display = 'none';
  document.body.appendChild(bar);
  const backBtn = document.createElement('button');
  backBtn.id = 'guide-back';
  backBtn.style.display = 'none';
  backBtn.addEventListener('click', () => zoomOut());
  document.body.appendChild(backBtn);

  // 状态
  let mode = false, zoomed = null;
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let downXY = null;

  renderer.domElement.addEventListener('pointerdown', (e) => (downXY = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!mode || !downXY) return;
    const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
    downXY = null;
    if (moved > 6) return; // 拖拽不算点击
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(hitMeshes, false);
    if (hits.length) zoomIn(hits[0].object.userData.plate);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!mode) { renderer.domElement.style.cursor = ''; return; }
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    renderer.domElement.style.cursor = ray.intersectObjects(hitMeshes, false).length ? 'pointer' : '';
  });

  function setBuildingVisible(vis) {
    if (vis) { restoreBuilding(); return; }
    for (const { group: g } of built.levels.values()) g.visible = false;
    built.mech.group.visible = false;
    built.site.visible = false;
    built.ground.visible = false;
    built.grid.visible = false;
    built.hero.visible = false;
    built.labels.forEach((l) => (l.obj.visible = false));
  }
  function restoreBuilding() {
    for (const [id, { group: g }] of built.levels) g.visible = state.visible.has(id);
    built.mech.group.visible = true;
    built.site.visible = true;
    built.ground.visible = true;
    built.grid.visible = true;
    built.hero.visible = true;
    built.labels.forEach((l) => (l.obj.visible = state.labels && state.visible.has(l.id)));
  }

  function enter() {
    if (mode) return;
    mode = true;
    if (ctx.demo) ctx.demo.stopBeam();
    if (ctx.hotspots) ctx.hotspots.setSceneVisible(false);
    setBuildingVisible(false);
    group.visible = true;
    refresh();
    bar.style.display = 'block';
    ctx.demo.flyTo(GUIDE_VIEW);
  }
  function exit() {
    mode = false;
    zoomed = null;
    group.visible = false;
    bar.style.display = 'none';
    backBtn.style.display = 'none';
    if (ctx.hotspots) ctx.hotspots.setSceneVisible(true);
    restoreBuilding();
  }
  function zoomIn(p) {
    zoomed = p;
    for (const q of PLATES) q._pg.visible = q.y <= p.y; // 隐藏上方的板，正俯视不被遮挡
    ctx.demo.flyTo({ pos: [0, p.y + 95, 0.6], tgt: [0, p.y, 0] });
    backBtn.style.display = 'block';
    refresh();
  }
  function zoomOut() {
    zoomed = null;
    for (const q of PLATES) q._pg.visible = true;
    backBtn.style.display = 'none';
    ctx.demo.flyTo(GUIDE_VIEW);
  }

  // 调试/截图：瞬移（无补间）
  function snapEnter(plateId) {
    enter();
    ctx.demo.cancelFlight();
    camera.position.set(...GUIDE_VIEW.pos);
    controls.target.set(...GUIDE_VIEW.tgt);
    if (plateId) {
      const p = PLATES.find((x) => x.id === plateId);
      if (p) {
        zoomed = p;
        for (const q of PLATES) q._pg.visible = q.y <= p.y;
        camera.position.set(0, p.y + 95, 0.6);
        controls.target.set(0, p.y, 0);
        backBtn.style.display = 'block';
      }
    }
    refresh();
  }

  function refresh() {
    const L = state.lang;
    for (const p of PLATES) p._div.textContent = p.name[L];
    bar.textContent = L === 'zh' ? '点击楼层板，放大查看该层平面图' : 'Click a floor plate to view its plan';
    backBtn.textContent = L === 'zh' ? '← 返回楼层导引' : '← Back to Guide';
  }

  return { enter, exit, zoomIn, zoomOut, snapEnter, refresh, isOn: () => mode };
}
