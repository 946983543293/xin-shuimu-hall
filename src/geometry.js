// 几何生成层：吃 CONFIG 吐几何，纯函数，按层分组
import * as THREE from 'three';
import { CSS2DObject } from '../lib/CSS2DRenderer.js';
import { CONFIG, computeElevations } from '../building.config.js';

const C = CONFIG.colors;

// ---- 平面坐标常数（世界坐标：x 东，z 南）----
const X = { west: -45, westServiceEnd: -24, westMastEnd: -19, eastMastStart: 28, eastServiceStart: 33, east: 45 };
const Z = { nOut: -10.5, nCorCap: -8.1, nCapPipe: -4.1, slotN: -2.5, slotS: 2.5, sCapPipe: 4.1, sCorCap: 8.1, sOut: 10.5 };
const SLAB = 0.3;

// ---- 工具：任意几何合并（顶点色），1 个网格 = 1 次 draw call ----
function mergeGeos(items) {
  const pos = [], norm = [], col = [];
  const c = new THREE.Color();
  for (const it of items) {
    const g = it.geo.index ? it.geo.toNonIndexed() : it.geo;
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) pos.push(p[i]);
    for (let i = 0; i < n.length; i++) norm.push(n[i]);
    c.set(it.color);
    for (let i = 0; i < p.length / 3; i++) col.push(c.r, c.g, c.b);
    if (g !== it.geo) g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}
function mergeBoxes(boxes) {
  return mergeGeos(boxes.map((b) => {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d);
    g.translate(b.x, b.y, b.z);
    return { geo: g, color: b.color };
  }));
}
const B = (w, h, d, x, y, z, color) => ({ w, h, d, x, y, z, color });

// 功能舱空位：奇数层北排/偶数层南排；起始位每层错位 1 格循环
function funcSlotOf(floorNum) {
  const start = CONFIG.capsule.funcSlotStartPos + ((floorNum - 3) % 9); // 7..15
  return { row: floorNum % 2 === 1 ? 'N' : 'S', start };
}
const capX = (i) => -24 + (i - 1) * 3 + 1.5; // 第 i 位中心 x

function floorLabel(id) { return id.startsWith('F') ? id.slice(1) + 'F' : id; }

// ============================================================
export function buildBuilding(scene, mats) {
  const EL = computeElevations();
  const levels = new Map();   // id -> { group, label }
  const labels = [];

  const mkLabel = (id, x, y, z) => {
    const div = document.createElement('div');
    div.className = 'floor-label';
    div.textContent = floorLabel(id);
    const obj = new CSS2DObject(div);
    obj.position.set(x, y, z);
    scene.add(obj);
    labels.push({ id, obj });
    return obj;
  };

  // ---------- 居住层 F3–F18 ----------
  for (const lv of EL.filter((e) => e.group === 'residential')) {
    const f = parseInt(lv.id.slice(1), 10);
    const base = lv.base;
    const g = new THREE.Group();
    g.name = lv.id;
    const sb = []; // 实体盒子

    // 楼板：舱体区拆南北两块（留 5m 槽），两端区整板
    sb.push(B(47, SLAB, 8.0, 4.5, base + SLAB / 2, -6.5, C.structGray[1]));
    sb.push(B(47, SLAB, 8.0, 4.5, base + SLAB / 2, 6.5, C.structGray[1]));
    sb.push(B(26, SLAB, 21, -32, base + SLAB / 2, 0, C.structGray[1]));
    sb.push(B(17, SLAB, 21, 36.5, base + SLAB / 2, 0, C.structGray[1]));
    // 槽边警示线
    sb.push(B(47, 0.06, 0.12, 4.5, base + SLAB + 0.03, Z.slotN, C.accentRust));
    sb.push(B(47, 0.06, 0.12, 4.5, base + SLAB + 0.03, Z.slotS, C.accentRust));
    // 西端：楼梯电梯核心 + 湿区
    sb.push(B(6, 3.3, 6, -42, base + SLAB + 1.65, -7.4, C.structGray[0]));
    sb.push(B(5, 3.3, 7, -42.5, base + SLAB + 1.65, 6.8, C.structGray[0]));
    // 东端：核心 + 观景小客厅
    sb.push(B(6, 3.3, 6.5, 42, base + SLAB + 1.65, -7.2, C.structGray[0]));
    sb.push(B(11.5, 0.06, 8, 39.4, base + SLAB + 0.06, 6.4, C.hallGold));
    // 东西端墙
    sb.push(B(0.2, 3.3, 21, -44.9, base + SLAB + 1.65, 0, C.structGray[0]));
    sb.push(B(0.2, 3.3, 21, 44.9, base + SLAB + 1.65, 0, C.structGray[0]));
    // 大空间区（按出厂功能配色）；10F 为通高上空（留空+栏杆）
    const prog = CONFIG.programs[lv.id] || '开放自习区';
    if (f === 10) {
      // 通高俯瞰：周边栏杆
      sb.push(B(13, 1.0, 0.12, -30.5, base + SLAB + 0.5, -8.1, C.structGray[0]));
      sb.push(B(13, 1.0, 0.12, -30.5, base + SLAB + 0.5, 8.1, C.structGray[0]));
      sb.push(B(0.12, 1.0, 16.2, -24, base + SLAB + 0.5, 0, C.structGray[0]));
    } else {
      sb.push(B(13, 0.07, 16.2, -30.5, base + SLAB + 0.07, 0, CONFIG.programColors[prog]));
      if (f === 9) { // 大客厅地台
        sb.push(B(9, 0.35, 10, -31, base + SLAB + 0.25, 0, C.hallGold));
      }
    }
    // 功能舱空位：防火卷帘 + 顶部锁接框
    const fs = funcSlotOf(f);
    const fsX = -24 + (fs.start - 1) * 3 + 3; // 6m 空位中心
    const fsZ = fs.row === 'N' ? -4.02 : 4.02;
    sb.push(B(6, 3.0, 0.12, fsX, base + SLAB + 1.5, fsZ, 0x4a423a));
    sb.push(B(6, 0.15, 0.4, fsX, base + SLAB + 3.05, fsZ, C.mechDark || 0x6b5b4a));

    const solid = new THREE.Mesh(mergeBoxes(sb), mats.solid);
    g.add(solid);

    // 玻璃幕墙（南北通长）
    const glassGeo = mergeBoxes([
      B(90, 3.6, 0.06, 0, base + 1.8, -10.47, 0xffffff),
      B(90, 3.6, 0.06, 0, base + 1.8, 10.47, 0xffffff),
    ]);
    g.add(new THREE.Mesh(glassGeo, mats.glass));

    // 舱体（InstancedMesh）+ 外廊立面片
    const caps = [];
    for (const row of ['N', 'S']) {
      for (let i = 1; i <= 17; i++) {
        if (row === fs.row && (i === fs.start || i === fs.start + 1)) continue;
        caps.push({ row, i });
      }
    }
    const capGeo = new THREE.BoxGeometry(CONFIG.capsule.w, CONFIG.capsule.h, CONFIG.capsule.d);
    const capMesh = new THREE.InstancedMesh(capGeo, mats.capsule, caps.length);
    const facGeo = new THREE.PlaneGeometry(CONFIG.capsule.w, CONFIG.capsule.h);
    const facMesh = new THREE.InstancedMesh(facGeo, mats.facade, caps.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    const col = new THREE.Color();
    caps.forEach((cp, k) => {
      const wood = C.wood[(f * 31 + cp.i * 7 + (cp.row === 'S' ? 3 : 0)) % 6];
      const y = base + SLAB + CONFIG.capsule.h / 2;
      const zc = cp.row === 'N' ? -6.1 : 6.1;
      m4.compose(v.set(capX(cp.i), y, zc), q.identity(), s1);
      capMesh.setMatrixAt(k, m4);
      capMesh.setColorAt(k, col.set(wood));
      // 立面片：朝外廊
      const qf = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cp.row === 'N' ? Math.PI : 0);
      m4.compose(v.set(capX(cp.i), y, cp.row === 'N' ? -8.12 : 8.12), qf, s1);
      facMesh.setMatrixAt(k, m4);
      facMesh.setColorAt(k, col.set(wood));
    });
    capMesh.instanceMatrix.needsUpdate = true;
    facMesh.instanceMatrix.needsUpdate = true;
    g.add(capMesh, facMesh);

    // 夜航灯光（默认隐藏）：走廊灯带 + 约 40% 舱体亮窗
    const nightMeshes = [];
    const strip = new THREE.Mesh(mergeBoxes([
      B(88, 0.05, 0.35, 0, base + 3.44, -9.3, 0xffffff),
      B(88, 0.05, 0.35, 0, base + 3.44, 9.3, 0xffffff),
    ]), mats.corridorLight);
    strip.visible = false;
    g.add(strip); nightMeshes.push(strip);
    const litCaps = caps.filter((cp, k) => (k * 13 + f * 7) % 5 < 2);
    const litMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.7, 1.1), mats.windowLit, litCaps.length);
    litCaps.forEach((cp, j) => {
      const qf = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cp.row === 'N' ? Math.PI : 0);
      m4.compose(v.set(capX(cp.i), base + SLAB + 1.6, cp.row === 'N' ? -8.14 : 8.14), qf, s1);
      litMesh.setMatrixAt(j, m4);
    });
    litMesh.instanceMatrix.needsUpdate = true;
    litMesh.visible = false;
    g.add(litMesh); nightMeshes.push(litMesh);
    g.userData.night = nightMeshes;

    // 18F 屋顶：光伏 + 花园 + 栏杆
    if (f === 18) {
      const rb = [];
      const top = lv.top;
      rb.push(B(90, 0.3, 21, 0, top + 0.15, 0, C.structGray[1]));
      for (let k = 0; k < 6; k++) rb.push(B(40, 0.12, 2.2, -20, top + 0.36, -7.5 + k * 3, 0x2f3a44));
      rb.push(B(25, 0.15, 12, 27, top + 0.38, 0, C.yardGreen));
      rb.push(B(89, 0.9, 0.12, 0, top + 0.75, -10.3, C.structGray[0]));
      rb.push(B(89, 0.9, 0.12, 0, top + 0.75, 10.3, C.structGray[0]));
      rb.push(B(0.12, 0.9, 21, -44.8, top + 0.75, 0, C.structGray[0]));
      rb.push(B(0.12, 0.9, 21, 44.8, top + 0.75, 0, C.structGray[0]));
      g.add(new THREE.Mesh(mergeBoxes(rb), mats.solid));
    }

    scene.add(g);
    levels.set(lv.id, { group: g, label: mkLabel(lv.id, 46.8, base + 1.8, 0) });
  }

  // ---------- 基座 F1/F2 ----------
  {
    const g = new THREE.Group(); g.name = 'F1';
    const pb = [];
    pb.push(B(108, 9.6, 25.2, 0, 4.8, 0, C.structGray[1])); // 基座体量
    // 2F 顶空中庭院：四周退界绿带 + 慢跑道环
    pb.push(B(108, 0.06, 2.0, 0, 9.66, -11.55, C.yardGreen));
    pb.push(B(108, 0.06, 2.0, 0, 9.66, 11.55, C.yardGreen));
    pb.push(B(9, 0.06, 25.2, -49.5, 9.66, 0, C.yardGreen));
    pb.push(B(9, 0.06, 25.2, 49.5, 9.66, 0, C.yardGreen));
    pb.push(B(105.6, 0.08, 0.35, 0, 9.68, -11.35, C.accentRust));
    pb.push(B(105.6, 0.08, 0.35, 0, 9.68, 11.35, C.accentRust));
    pb.push(B(0.35, 0.08, 22.7, -52.65, 9.68, 0, C.accentRust));
    pb.push(B(0.35, 0.08, 22.7, 52.65, 9.68, 0, C.accentRust));
    g.add(new THREE.Mesh(mergeBoxes(pb), mats.solid));
    // F1 玻璃带 + 两立柱玻璃展示井
    const glassGeo = mergeBoxes([
      B(108, 4.5, 0.06, 0, 2.25, -12.57, 0xffffff),
      B(108, 4.5, 0.06, 0, 2.25, 12.57, 0xffffff),
      B(5, 9.6, 8.2, -21.5, 4.8, 0, 0xffffff),
      B(5, 9.6, 8.2, 30.5, 4.8, 0, 0xffffff),
    ]);
    g.add(new THREE.Mesh(glassGeo, mats.glass));
    scene.add(g);
    levels.set('F1', { group: g, label: mkLabel('F1', 55.5, 2.5, 0) });
    const g2 = new THREE.Group(); g2.name = 'F2';
    scene.add(g2);
    levels.set('F2', { group: g2, label: mkLabel('F2', 55.5, 7.3, 0) });
  }

  // ---------- 地下 B1/B2 ----------
  {
    const g = new THREE.Group(); g.name = 'B1';
    const bb = [];
    bb.push(B(108, 0.3, 25.2, 0, -4.65, 0, C.structGray[1])); // B1 地坪
    bb.push(B(10, 0.06, 12, -14, -4.47, 0, C.accentRust));     // 舱体港（紧邻西立柱井）
    for (let k = 0; k < 6; k++) bb.push(B(30, 2.2, 0.8, -2, -4.5 + 1.25, -8 + k * 3.2, C.wood[k % 6])); // 舱体储存货架
    bb.push(B(20, 0.06, 16, 30, -4.47, 0, C.structGray[0]));   // 设备机房
    bb.push(B(18, 0.06, 14, -41, -4.47, 0, C.yardGreen));      // 自行车库
    g.add(new THREE.Mesh(mergeBoxes(bb), mats.solid));
    scene.add(g);
    levels.set('B1', { group: g, label: mkLabel('B1', 55.5, -3.0, 0) });
  }
  {
    const g = new THREE.Group(); g.name = 'B2';
    const bb = [];
    bb.push(B(108, 0.3, 25.2, 0, -11.15, 0, C.structGray[1]));
    bb.push(B(25, 0.35, 12, -24, -10.85, 0, C.waterBlue));     // 游泳馆
    bb.push(B(28, 0.07, 15, 16, -10.96, 0, C.wood[1]));        // 篮球馆
    bb.push(B(10, 0.06, 8, -42, -10.94, -6, C.structGray[0])); // 更衣淋浴
    bb.push(B(9, 0.06, 22, -49.5, -10.94, 0, C.yardGreen));    // 下沉庭院
    g.add(new THREE.Mesh(mergeBoxes(bb), mats.solid));
    scene.add(g);
    levels.set('B2', { group: g, label: mkLabel('B2', 55.5, -9.5, 0) });
  }

  // ---------- 龙门吊机械系统（常显）----------
  const mech = new THREE.Group(); mech.name = 'mechanics';
  const mastGeo = mergeBoxes([
    B(5, 81.6, 8.2, -21.5, 29.8, 0, C.structGray[0]),
    B(5, 81.6, 8.2, 30.5, 29.8, 0, C.structGray[0]),
    // 竖轨（内侧深色）
    B(0.3, 81.6, 1.2, -19.15, 29.8, -1.2, 0x4a423a),
    B(0.3, 81.6, 1.2, -19.15, 29.8, 1.2, 0x4a423a),
    B(0.3, 81.6, 1.2, 28.15, 29.8, -1.2, 0x4a423a),
    B(0.3, 81.6, 1.2, 28.15, 29.8, 1.2, 0x4a423a),
  ]);
  const masts = new THREE.Mesh(mastGeo, mats.solid);
  mech.add(masts);
  const mastEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5, 81.6, 8.2)), mats.edge);
  mastEdges.position.set(-21.5, 29.8, 0);
  const mastEdges2 = mastEdges.clone(); mastEdges2.position.set(30.5, 29.8, 0);
  mech.add(mastEdges, mastEdges2);

  // 横梁 + 小车 + 机械臂（闲时停屋顶）
  const beamGroup = new THREE.Group(); beamGroup.name = 'beam';
  const beam = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.mechanics.beamSpan, 1.6, 3.0), mats.mech);
  const beamEdge = new THREE.LineSegments(new THREE.EdgesGeometry(beam.geometry), mats.edge);
  beam.add(beamEdge);
  beamGroup.add(beam);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(3, 1.0, 3.4), mats.mechDark);
  trolley.position.set(-18, -1.3, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.9), mats.mechDark);
  arm.position.set(-18, -2.8, 0);
  beamGroup.add(trolley, arm);
  beamGroup.position.set(4.5, 68.6, 0);
  mech.add(beamGroup);
  scene.add(mech);

  // ---------- 场地 ----------
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(220, 64),
    new THREE.MeshLambertMaterial({ color: 0xe9eae0 })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.005;
  const grid = new THREE.GridHelper(440, 44, 0xcfc8ba, 0xe2dccf);
  grid.position.y = 0.02;
  scene.add(ground, grid);

  // ---------- 校园场景（道路/广场/树林/周边建筑/路灯）----------
  const site = buildSite(scene, mats);

  // ---------- 天空穹顶（昼：太阳+云；夜：星空+月）----------
  const sky = buildSky(scene);

  // ---------- L3 样板舱（广场上 1:1 展示间）----------
  const hero = buildHeroCapsule(scene, mats);

  return { levels, labels, mech: { group: mech, beam: beamGroup, trolley, arm }, ground, grid, site, sky, hero };
}

// ============================================================
// 样板舱：3×4 单人舱全内饰，南侧开敞展示
function buildHeroCapsule(scene, mats) {
  const hero = new THREE.Group();
  hero.name = 'heroCapsule';
  const HX = 62, HZ = 16; // 广场东南，面向南主路开敞
  const W = 3.0, D = 4.0, H = 3.0;

  const shell = [
    B(4.4, 0.15, 5.4, HX, 0.075, HZ, C.structGray[1]),          // 基台
    B(W, 0.1, D, HX, 0.2, HZ, C.wood[1]),                       // 地板
    B(W, H, 0.1, HX, 0.25 + H / 2, HZ - D / 2 + 0.05, C.wood[3]), // 北墙（临槽面）
    B(0.1, H, D, HX - W / 2 + 0.05, 0.25 + H / 2, HZ, C.wood[2]), // 西墙
    B(0.1, H, D, HX + W / 2 - 0.05, 0.25 + H / 2, HZ, C.wood[2]), // 东墙
    B(W + 0.3, 0.12, D + 0.3, HX, 0.25 + H + 0.06, HZ, C.wood[4]), // 顶板
  ];
  const shellMesh = new THREE.Mesh(mergeBoxes(shell), mats.solid);
  hero.add(shellMesh);

  const furn = [
    // 床（西墙下）：床架 + 床垫 + 枕头
    B(1.0, 0.3, 2.0, HX - 0.9, 0.4, HZ - 0.9, C.wood[4]),
    B(0.9, 0.18, 1.9, HX - 0.9, 0.64, HZ - 0.9, C.reportBlue),
    B(0.6, 0.12, 0.4, HX - 0.9, 0.78, HZ - 1.6, 0xffffff),
    // 书桌 + 椅（北墙）
    B(1.2, 0.06, 0.5, HX + 0.7, 0.95, HZ - 1.7, C.wood[1]),
    B(0.06, 0.7, 0.5, HX + 0.15, 0.6, HZ - 1.7, C.wood[4]),
    B(0.06, 0.7, 0.5, HX + 1.25, 0.6, HZ - 1.7, C.wood[4]),
    B(0.42, 0.45, 0.42, HX + 0.7, 0.48, HZ - 1.1, C.structGray[0]),
    B(0.42, 0.5, 0.08, HX + 0.7, 0.85, HZ - 0.9, C.structGray[0]),
    // 衣柜（东墙北端）
    B(0.55, 1.9, 0.55, HX + 1.15, 1.2, HZ - 1.55, C.wood[5]),
    // 卫浴盒（东墙南端，磨砂）
    B(0.85, 2.2, 0.85, HX + 1.0, 1.35, HZ + 1.35, C.structGray[0]),
    // 书架（西墙上部）
    B(0.25, 0.8, 1.4, HX - 1.32, 2.2, HZ - 0.6, C.wood[5]),
  ];
  hero.add(new THREE.Mesh(mergeBoxes(furn), mats.solid));
  // 暖光顶灯（常亮）
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.8), mats.corridorLight);
  lamp.position.set(HX, 0.25 + H - 0.03, HZ);
  hero.add(lamp);
  // 外壳墨线
  const eg = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.3, H + 0.4, D + 0.3)), mats.edge);
  eg.position.set(HX, 0.25 + (H + 0.4) / 2 - 0.1, HZ);
  hero.add(eg);

  scene.add(hero);
  return hero;
}

// ============================================================
// 天空：Canvas 渐变 + 天体，正反面两套纹理随主题切换
function buildSky(scene) {
  const day = makeSkyTexture(true), night = makeSkyTexture(false);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(520, 32, 16),
    new THREE.MeshBasicMaterial({ map: day, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  sky.userData = { day, night };
  scene.add(sky);
  return sky;
}
function makeSkyTexture(dayTime) {
  const cv = document.createElement('canvas');
  const W = dayTime ? 1024 : 2048, H = dayTime ? 512 : 1024;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  if (dayTime) {
    gr.addColorStop(0, '#8FB8D8'); gr.addColorStop(0.5, '#C9DCEA');
    gr.addColorStop(0.78, '#F3EDE2'); gr.addColorStop(1, '#FAF7F2');
  } else {
    gr.addColorStop(0, '#020408'); gr.addColorStop(0.55, '#0A101A');
    gr.addColorStop(0.85, '#141C2A'); gr.addColorStop(1, '#1D2736');
  }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  let seed = dayTime ? 7 : 13;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  if (dayTime) {
    const sg = g.createRadialGradient(280, 140, 10, 280, 140, 150);
    sg.addColorStop(0, 'rgba(255,246,220,.95)'); sg.addColorStop(0.25, 'rgba(255,240,200,.5)'); sg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 14; i++) {
      const cx = rnd() * W, cy = 60 + rnd() * 170, s = 20 + rnd() * 40;
      for (let j = 0; j < 5; j++) {
        g.beginPath();
        g.ellipse(cx + (rnd() - 0.5) * s * 2, cy + (rnd() - 0.5) * s * 0.5, s * (0.5 + rnd() * 0.7), s * 0.32, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else {
    for (let i = 0; i < 800; i++) {
      const x = rnd() * W, y = rnd() * H * 0.7, r = 0.5 + rnd() * 1.2;
      g.fillStyle = rnd() > 0.85 ? 'rgba(180,230,255,' + (0.4 + rnd() * 0.6) + ')' : 'rgba(255,255,255,' + (0.25 + rnd() * 0.65) + ')';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const mg = g.createRadialGradient(1480, 240, 16, 1480, 240, 180);
    mg.addColorStop(0, 'rgba(242,234,216,1)'); mg.addColorStop(0.3, 'rgba(242,234,216,.35)'); mg.addColorStop(1, 'rgba(242,234,216,0)');
    g.fillStyle = mg; g.fillRect(1300, 60, 360, 360);
    g.fillStyle = '#F2EAD8'; g.beginPath(); g.arc(1480, 240, 32, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================
// 校园环境：低饱和配角，衬托主楼
function buildSite(scene, mats) {
  const site = new THREE.Group(); site.name = 'site';
  const ROAD = '#C6C1B4', PLAZA = '#EFEAE0', LAWN = '#D5E5D0';

  const flat = [
    // 环楼广场（基座外一圈硬质铺装）
    B(150, 0.03, 52, 0, 0.015, 0, PLAZA),
    // 南主路（东西向）+ 北路 + 西路
    B(320, 0.04, 10, 0, 0.02, 39, ROAD),
    B(320, 0.04, 7, 0, 0.02, -32, ROAD),
    B(8, 0.04, 200, -76, 0.02, 0, ROAD),
    // 三片集中绿地
    B(46, 0.05, 36, 84, 0.025, -62, LAWN),
    B(50, 0.05, 36, 90, 0.025, 70, LAWN),
    B(42, 0.05, 40, -114, 0.025, -60, LAWN),
    B(60, 0.05, 30, -40, 0.025, 90, LAWN),
  ];
  site.add(new THREE.Mesh(mergeBoxes(flat), mats.solid));

  // 周边建筑（体块 + 墨色描边，不抢戏）
  const NB = [
    [-128, -62, 34, 24, 20], [118, -74, 38, 30, 34], [136, 8, 26, 26, 27],
    [-136, 26, 42, 22, 17], [96, 96, 32, 30, 22], [-58, 104, 46, 26, 15],
    [24, -88, 40, 24, 12],
  ];
  const nbBoxes = [];
  NB.forEach(([x, z, w, d, h], i) => {
    nbBoxes.push(B(w, h, d, x, h / 2, z, i % 2 ? C.structGray[0] : '#DDD8CC'));
    nbBoxes.push(B(w - 2, 0.6, d - 2, x, h + 0.3, z, C.structGray[0]));
    const eg = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), mats.edge);
    eg.position.set(x, h / 2, z);
    site.add(eg);
  });
  site.add(new THREE.Mesh(mergeBoxes(nbBoxes), mats.solid));

  // 树（行道树 + 绿地树群，固定种子伪随机）
  const trunks = [], canopies = [];
  let seed = 42;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tree = (x, z, s = 1) => {
    const trunk = new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 2.4 * s, 6);
    trunk.translate(x, 1.2 * s, z);
    trunks.push({ geo: trunk, color: '#8F6B4A' });
    const r = (1.5 + rnd() * 0.9) * s;
    const can = new THREE.IcosahedronGeometry(r, 0);
    can.scale(1, 1.15, 1);
    can.translate(x, 2.4 * s + r * 0.85, z);
    canopies.push({ geo: can, color: rnd() > 0.5 ? '#8FB088' : '#7FA37B' });
  };
  for (let x = -150; x <= 150; x += 15) { tree(x, 30.5); tree(x, 47.5); }   // 南主路两侧
  for (let x = -150; x <= 150; x += 15) tree(x, -25.5);                     // 北路南侧
  for (let z = -90; z <= 90; z += 15) { tree(-68.5, z); tree(-83.5, z); }   // 西路两侧
  const cluster = (cx, cz, w, d, n) => { for (let i = 0; i < n; i++) tree(cx + (rnd() - 0.5) * w, cz + (rnd() - 0.5) * d, 0.9 + rnd() * 0.5); };
  cluster(84, -62, 40, 30, 12); cluster(90, 70, 44, 30, 10);
  cluster(-114, -60, 36, 34, 10); cluster(-40, 90, 52, 24, 8);
  site.add(new THREE.Mesh(mergeGeos(trunks), mats.solid));
  site.add(new THREE.Mesh(mergeGeos(canopies), mats.solid));

  // 南主路路灯
  const lamps = [];
  const lampX = [];
  for (let x = -144; x <= 144; x += 24) {
    const pole = new THREE.CylinderGeometry(0.09, 0.12, 6, 5);
    pole.translate(x, 3, 31.5);
    lamps.push({ geo: pole, color: '#7A7468' });
    lamps.push({ geo: new THREE.BoxGeometry(1.6, 0.14, 0.4).translate(x + 0.6, 6, 31.5), color: '#7A7468' });
    lampX.push(x);
  }
  site.add(new THREE.Mesh(mergeGeos(lamps), mats.solid));

  // 夜航：路灯光球 + 地面光晕（默认隐藏）
  const headGeos = [], poolGeos = [];
  for (const x of lampX) {
    headGeos.push({ geo: new THREE.SphereGeometry(0.38, 8, 6).translate(x + 0.9, 5.9, 31.5), color: '#FFE2B0' });
    poolGeos.push({ geo: new THREE.CircleGeometry(3.4, 16).rotateX(-Math.PI / 2).translate(x + 0.9, 0.05, 31.5), color: '#FFD9A0' });
  }
  const lampHeads = new THREE.Mesh(mergeGeos(headGeos), mats.lampGlow);
  const lampPools = new THREE.Mesh(mergeGeos(poolGeos), mats.lampPool);
  lampHeads.visible = false; lampPools.visible = false;
  site.add(lampHeads, lampPools);
  site.userData.night = [lampHeads, lampPools];

  scene.add(site);
  return site;
}
