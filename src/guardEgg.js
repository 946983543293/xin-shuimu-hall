// ============================================================
// 样板舱小彩蛋（无界面提示）：点击广场上的 1:1 样板舱
// 舱内保安小人走出来 → 四处张望 → 头上冒"？" → 再冒"……" → 走回舱内
// ============================================================
import * as THREE from 'three';
import { CSS2DObject } from '../lib/CSS2DRenderer.js';

const P_IN = { x: 61.9, y: 0.25, z: 16.9 };     // 舱内站位
const P_OUT = { x: 62.4, y: 0.05, z: 20.6 };    // 舱外站位

// 时间轴（秒）
const T = {
  walkOut: [0.15, 1.45],
  look: [1.60, 4.00],
  q: [4.00, 5.90],      // "？"
  dots: [5.90, 7.80],   // "……"
  walkBack: [7.80, 9.10],
  end: 9.45,
};

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initGuardEgg(ctx) {
  const { scene, built, camera, renderer } = ctx;
  if (!built.hero) return { update() {} };

  const NAVY = 0x2b3a52, VEST = 0xe8b02a, SKIN = 0xe0b48c, DARK = 0x232a36, BADGE = 0xc9a227;

  const guard = new THREE.Group();
  guard.name = 'heroGuard';
  const matNavy = new THREE.MeshLambertMaterial({ color: NAVY });
  const matVest = new THREE.MeshLambertMaterial({ color: VEST });
  const matSkin = new THREE.MeshLambertMaterial({ color: SKIN });
  const matDark = new THREE.MeshLambertMaterial({ color: DARK });
  const matBadge = new THREE.MeshLambertMaterial({ color: BADGE });

  // 腿（髋部为轴）
  const legs = [];
  for (const sx of [-0.10, 0.10]) {
    const g = new THREE.Group(); g.position.set(sx, 0.82, 0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.82, 8), matNavy);
    m.position.y = -0.41; g.add(m);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.26), matDark);
    shoe.position.set(0, -0.80, 0.05); g.add(shoe);
    guard.add(g); legs.push(g);
  }
  // 躯干 + 反光背心 + 腰带 + 胸牌
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.68, 10), matNavy);
  torso.position.y = 1.16; guard.add(torso);
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.255, 0.46, 10, 1, true), matVest);
  vest.position.y = 1.20; vest.material.side = THREE.DoubleSide; guard.add(vest);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.09, 10), matDark);
  belt.position.y = 0.86; guard.add(belt);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.13, 0.03), matBadge);
  badge.position.set(0.12, 1.30, -0.20); guard.add(badge);
  // 手臂（肩部为轴）
  const arms = [];
  for (const sx of [-0.235, 0.235]) {
    const g = new THREE.Group(); g.position.set(sx, 1.44, 0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.054, 0.62, 7), matNavy);
    m.position.y = -0.31; g.add(m);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.07, 7), matVest);
    cuff.position.y = -0.56; g.add(cuff);
    guard.add(g); arms.push(g);
  }
  // 头 + 大檐帽（颈部为轴，便于左右张望）
  const headG = new THREE.Group(); headG.position.y = 1.50;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 10), matSkin);
  head.position.y = 0.18; headG.add(head);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.15, 12), matDark);
  crown.position.y = 0.36; headG.add(crown);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.035, 0.20), matDark);
  brim.position.set(0, 0.30, 0.16); headG.add(brim);
  guard.add(headG);

  // 头顶气泡："？" / "……"
  const mkMark = (text) => {
    const d = document.createElement('div');
    d.textContent = text;
    d.style.cssText = 'font-size:26px;font-weight:700;color:#B54A2E;letter-spacing:2px;'
      + 'text-shadow:0 1px 5px rgba(255,255,255,.85);pointer-events:none;user-select:none;';
    const o = new CSS2DObject(d);
    o.position.set(0, 2.25, 0);
    o.visible = false;
    guard.add(o);
    return o;
  };
  const markQ = mkMark('？');
  const markDots = mkMark('……');

  const place = (p, hdg) => { guard.position.set(p.x, p.y, p.z); guard.rotation.y = hdg; };
  place(P_IN, 0);
  scene.add(guard);

  // ---------- 交互 ----------
  let t = -1, playing = false;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;

  const onDown = (e) => { down = { x: e.clientX, y: e.clientY, time: performance.now() }; };
  const onUp = (e) => {
    const d = down; down = null;
    if (!d || playing) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;      // 拖拽视角，不算点击
    if (performance.now() - d.time > 600) return;
    if (ctx.egg && ctx.egg.isPlaying && ctx.egg.isPlaying()) return;   // 撞楼彩蛋进行中不响应
    if (ctx.guide && ctx.guide.isOn && ctx.guide.isOn()) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(built.hero, true).length) start();
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  function start() { playing = true; t = 0; markQ.visible = false; markDots.visible = false; }

  // ---------- 每帧 ----------
  function update(dt) {
    if (!playing) {
      // 待机：站在舱内，轻微呼吸
      place(P_IN, 0);
      const b = Math.sin(performance.now() * 0.0016) * 0.008;
      guard.position.y = P_IN.y + b;
      return;
    }
    t += dt;

    const walking = (t >= T.walkOut[0] && t < T.walkOut[1]) || (t >= T.walkBack[0] && t < T.walkBack[1]);
    const out = t >= T.walkOut[1] && t < T.walkBack[0];

    if (t < T.walkOut[0]) {
      place(P_IN, 0);
    } else if (t < T.walkOut[1]) {
      const k = ease(clamp01((t - T.walkOut[0]) / (T.walkOut[1] - T.walkOut[0])));
      place({ x: P_IN.x + (P_OUT.x - P_IN.x) * k, y: P_IN.y + (P_OUT.y - P_IN.y) * k, z: P_IN.z + (P_OUT.z - P_IN.z) * k }, 0);
    } else if (out) {
      place(P_OUT, 0);
    } else if (t < T.walkBack[1]) {
      const k = ease(clamp01((t - T.walkBack[0]) / (T.walkBack[1] - T.walkBack[0])));
      place({ x: P_OUT.x + (P_IN.x - P_OUT.x) * k, y: P_OUT.y + (P_IN.y - P_OUT.y) * k, z: P_OUT.z + (P_IN.z - P_OUT.z) * k }, Math.PI);
    } else {
      place(P_IN, 0);
    }

    // 迈步：腿/臂摆动
    if (walking) {
      const ph = t * 7.5;
      legs[0].rotation.x = Math.sin(ph) * 0.55;
      legs[1].rotation.x = -Math.sin(ph) * 0.55;
      arms[0].rotation.x = -Math.sin(ph) * 0.42;
      arms[1].rotation.x = Math.sin(ph) * 0.42;
      headG.rotation.y = 0;
    } else {
      legs[0].rotation.x *= 0.85; legs[1].rotation.x *= 0.85;
      // 张望：左 → 右 → 回中
      if (t >= T.look[0] && t < T.look[1]) {
        const k = (t - T.look[0]) / (T.look[1] - T.look[0]);
        headG.rotation.y = Math.sin(k * Math.PI * 2) * 0.85;
        guard.rotation.y = Math.sin(k * Math.PI * 2) * 0.22;
        arms[0].rotation.x = 0.10 + Math.sin(t * 1.6) * 0.05;
        arms[1].rotation.x = 0.10 + Math.sin(t * 1.6 + 1) * 0.05;
      } else {
        headG.rotation.y *= 0.9;
        guard.rotation.y *= 0.9;
        arms[0].rotation.x *= 0.9; arms[1].rotation.x *= 0.9;
      }
    }

    // 头顶标记
    markQ.visible = t >= T.q[0] && t < T.q[1];
    if (markQ.visible) markQ.position.y = 2.25 + Math.sin(t * 4) * 0.05;
    markDots.visible = t >= T.dots[0] && t < T.dots[1];

    if (t >= T.end) {
      playing = false; t = -1;
      markQ.visible = false; markDots.visible = false;
      place(P_IN, 0);
      legs[0].rotation.x = legs[1].rotation.x = 0;
      arms[0].rotation.x = arms[1].rotation.x = 0;
      headG.rotation.y = 0;
    }
  }

  return { update, isPlaying: () => playing };
}
