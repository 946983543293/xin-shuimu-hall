// ============================================================
// 隐藏彩蛋 —— 无任何界面提示
// 触发方式（唯一）：连续点击中英文切换按钮 11 次
// 第 7 次时，底部出现一句短暂的小提示后消失
// ============================================================
import * as THREE from 'three';
import { CONFIG } from '../building.config.js';

const TRIGGER = 11;          // 触发所需连续点击次数
const HINT_AT = 7;           // 第几次点击出现提示
const GAP_MS = 1600;         // 两次点击间隔超过该值即重新计数
const HINT_MS = 1700;        // 提示停留时长

// 时间轴（秒）
const T = {
  planeIn: 0.45,
  impact: 3.5,
  collapse: 0.66,
  stagger: 0.036,
  riseFlash: 8.0,
  riseStart: 8.4,
  riseDur: 2.9,
  restore: 11.7,
  end: 12.15,
};
const SINK_FROM = 86;                                  // 新楼起始埋深
const IMPACT = new THREE.Vector3(0, 33, 0);            // 撞击点
const START = new THREE.Vector3(-330, 132, 205);       // 飞机起飞位（远）

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function initEasterEgg(ctx) {
  const { scene, camera, controls, built, state } = ctx;

  // ---------- 样式 + 提示元素（唯一可见的线索，仅第 7 次点击闪现） ----------
  const style = document.createElement('style');
  style.textContent = `
    #egg-hint{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);
      font-size:12px;letter-spacing:4px;color:rgba(58,53,46,.40);
      pointer-events:none;opacity:0;transition:opacity .6s ease;z-index:40;}
    body.night #egg-hint{color:rgba(228,236,244,.34);}
    body.egg-on .hud,body.egg-on button,body.egg-on #panel,body.egg-on #data-panel,
    body.egg-on #hotspot-layer,body.egg-on #labels{display:none!important;}
  `;
  document.head.appendChild(style);

  const hintEl = document.createElement('div');
  hintEl.id = 'egg-hint';
  hintEl.textContent = '（发生了一些变化……）';
  document.body.appendChild(hintEl);

  // ---------- 计数 ----------
  let count = 0, lastClick = 0, hintTimer = 0, langBefore = null;
  let playing = false, t = 0, onUserGrab = null;

  const langBtn = document.getElementById('lang-btn');
  if (langBtn) langBtn.addEventListener('click', onLangClick);

  function onLangClick() {
    if (playing) { count = 0; return; }
    const now = performance.now();
    if (now - lastClick > GAP_MS) { count = 0; langBefore = null; }
    lastClick = now;
    count++;
    if (count === 1) langBefore = state.lang === 'zh' ? 'en' : 'zh';  // 本次点击刚翻转，取反向
    if (count === HINT_AT) showHint();
    if (count >= TRIGGER) { count = 0; start(); }
  }

  function showHint() {
    hintEl.style.opacity = '1';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hintEl.style.opacity = '0'; }, HINT_MS);
  }

  // ---------- 场景资源 ----------
  let plane = null, planeParts = [];
  let targets = [];                              // 楼体分组（坍塌/升起）
  let fx = null;                                 // 各类特效
  let snap = null;                               // 触发前的用户状态

  const rnd = (() => { let s = 20260911; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  function addAdditive(geo, color, opacity) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    scene.add(m);
    return m;
  }

  // ---------- 启动 ----------
  function start() {
    if (playing) return;
    playing = true; t = 0;

    snap = {
      theme: state.theme, glass: state.glass, lang: state.lang,
      visible: new Set(state.visible),
      camPos: camera.position.clone(), camTgt: controls.target.clone(),
    };

    // 清场：停止既有演示，避免互相打架
    if (ctx.demo) { ctx.demo.stopBeam(); if (ctx.demo.cancelFlight) ctx.demo.cancelFlight(); }
    if (ctx.p2) {
      if (ctx.p2.stopFlow) ctx.p2.stopFlow();
      if (ctx.p2.stopGrowth) ctx.p2.stopGrowth();
      if (ctx.p2.restoreAllCapsules) ctx.p2.restoreAllCapsules();
    }
    if (ctx.guide && ctx.guide.isOn && ctx.guide.isOn()) ctx.guide.exit();

    // 隐藏全部界面 / 进入观影态（仍允许用户自由转视角、缩放）
    document.body.classList.add('egg-on');
    controls.enabled = true;
    if (onUserGrab) controls.removeEventListener('start', onUserGrab);
    onUserGrab = () => { if (ctx.demo && ctx.demo.cancelFlight) ctx.demo.cancelFlight(); };
    controls.addEventListener('start', onUserGrab);

    // 场景设定：日间图纸主题 + 仅地上 + 全览鸟瞰
    ctx.ui.setTheme('light');
    ctx.ui.setAll((id) => !id.startsWith('B'));
    ctx.demo.flyTo('presetAerial');

    collectTargets();
    buildPlane();
    fx = { lights: [], meshes: [], debris: null, debrisData: null, flames: [], glow: null, started: false };
    hintEl.style.opacity = '0';
  }

  function collectTargets() {
    targets = [];
    const levels = built.levels;
    const tower = [];
    for (const [id, rec] of levels) {
      const m = /^F(\d+)$/.exec(id);
      if (m && +m[1] >= 3) tower.push({ n: +m[1], g: rec.group });
    }
    tower.sort((a, b) => a.n - b.n);                                   // 从下往上逐层塌
    tower.forEach((x, i) => targets.push({ g: x.g, delay: i * T.stagger, kind: 'tower' }));
    for (const id of ['F1', 'F2']) {                                   // 基座同步
      const r = levels.get(id);
      if (r) targets.push({ g: r.group, delay: 0, kind: 'tower' });
    }
    for (const id of ['B1', 'B2']) {                                   // 地下整体沉掉
      const r = levels.get(id);
      if (r) targets.push({ g: r.group, delay: 0, kind: 'under' });
    }
    targets.push({ g: built.mech.group, delay: 0.10, kind: 'tower' }); // 龙门吊
  }

  // ---------- 飞机 ----------
  function buildPlane() {
    plane = new THREE.Group();
    plane.name = 'eggPlane';
    const body = new THREE.MeshLambertMaterial({ color: 0xdde3ea });
    const dark = new THREE.MeshLambertMaterial({ color: 0x46505c });
    const rust = new THREE.MeshLambertMaterial({ color: CONFIG.colors.accentRust });
    const glass = new THREE.MeshLambertMaterial({ color: 0x6f93b5 });

    const push = (geo, mat, x, y, z, rotZ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (rotZ) m.rotation.z = rotZ;
      plane.add(m);
      planeParts.push({ geo, mat, x, y, z });
      return m;
    };
    // 机身（沿 +X）
    push(new THREE.CylinderGeometry(3.3, 2.9, 50, 14), body, 1, 0, 0, -Math.PI / 2);
    push(new THREE.ConeGeometry(3.3, 11, 14), body, 31.5, 0, 0, -Math.PI / 2);   // 机头
    push(new THREE.ConeGeometry(2.9, 9, 14), body, -28.5, 0, 0, Math.PI / 2);    // 尾锥
    push(new THREE.BoxGeometry(20, 1.1, 46), dark, 2, -0.7, 0);                  // 主翼
    push(new THREE.BoxGeometry(9, 1.0, 21), dark, -22, 0.8, 0);                  // 平尾
    push(new THREE.BoxGeometry(9, 12, 1.1), rust, -23.5, 6.2, 0);                // 垂尾
    push(new THREE.CylinderGeometry(2.1, 2.1, 9, 12), dark, 5, -2.8, 12, -Math.PI / 2);
    push(new THREE.CylinderGeometry(2.1, 2.1, 9, 12), dark, 5, -2.8, -12, -Math.PI / 2);
    push(new THREE.BoxGeometry(6, 2.4, 3.6), glass, 22.5, 1.9, 0);               // 驾驶舱
    // 引擎尾焰
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (const z of [12, -12]) {
      const q = new THREE.Mesh(new THREE.SphereGeometry(1.9, 10, 8), glowMat);
      q.position.set(-0.6, -2.8, z);
      q.scale.set(2.6, 1, 1);
      plane.add(q);
    }
    // 墨线描边（与全站线条语言一致）
    const eg = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(20, 1.1, 46)), new THREE.LineBasicMaterial({ color: 0x3a352e }));
    eg.position.set(2, -0.7, 0); plane.add(eg);

    // 姿态：对准撞击点
    const dir = IMPACT.clone().sub(START).normalize();
    plane.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    plane.rotateX(-0.34);                     // 轻微横滚，更像正在扑下去
    plane.position.copy(START);
    plane.visible = false;                    // 到点才现身
    scene.add(plane);
  }

  // ---------- 爆炸 / 坍塌 / 扬起 ----------
  function explode() {
    const P = IMPACT;
    // 闪光
    const fl = new THREE.PointLight(0xffe0a0, 0, 460);
    fl.position.copy(P); scene.add(fl); fx.lights.push(fl);
    const flash = addAdditive(new THREE.SphereGeometry(1, 16, 12), 0xfff3d0, 1);
    flash.position.copy(P); flash.scale.setScalar(2); fx.meshes.push(flash);
    fx.flash = flash; fx.flashT = 0;

    // 火球 + 几个小团
    const fire = addAdditive(new THREE.SphereGeometry(1, 20, 14), 0xff8a2e, 0.95);
    fire.position.copy(P); fx.meshes.push(fire); fx.fire = fire;
    fx.blobs = [];
    for (let i = 0; i < 5; i++) {
      const b = addAdditive(new THREE.SphereGeometry(1, 12, 9), i % 2 ? 0xffb347 : 0xff6a1a, 0.85);
      b.position.copy(P).add(new THREE.Vector3((rnd() - 0.5) * 34, (rnd() - 0.4) * 20, (rnd() - 0.5) * 26));
      fx.meshes.push(b); fx.blobs.push(b);
    }
    // 冲击波环
    const ring = addAdditive(new THREE.RingGeometry(1, 1.5, 56), 0xffe9c0, 0.8);
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 2.2, 0);
    fx.meshes.push(ring); fx.ring = ring;

    // 尘土
    const dust = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshLambertMaterial({ color: 0xcfc6b4, transparent: true, opacity: 0.5, depthWrite: false }));
    dust.position.set(0, 7, 0); dust.scale.setScalar(8);
    scene.add(dust); fx.meshes.push(dust); fx.dust = dust;

    // 碎片（飞机 + 楼体）
    const N = 54;
    const dm = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), dm, N);
    im.frustumCulled = false;
    const data = [];
    const col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2, sp = 16 + rnd() * 42;
      data.push({
        p: P.clone().add(new THREE.Vector3((rnd() - 0.5) * 22, (rnd() - 0.5) * 26, (rnd() - 0.5) * 18)),
        v: new THREE.Vector3(Math.cos(a) * sp, 6 + rnd() * 34, Math.sin(a) * sp * 0.7),
        s: 0.7 + rnd() * 2.9,
        r: new THREE.Vector3(rnd() * 6, rnd() * 6, rnd() * 6),
      });
      const isPlane = i % 3 === 0;
      col.set(isPlane ? 0xd8dee6 : (i % 3 === 1 ? '#cfc8ba' : '#b8b0a0'));
      im.setColorAt(i, col);
    }
    scene.add(im);
    fx.debris = im; fx.debrisData = data;

    // 废墟堆
    fx.rubble = buildRubble();
  }

  function buildRubble() {
    const N = 96;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
    im.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const col = new THREE.Color();
    const pal = ['#cfc8ba', '#bdb5a6', '#a89f8e', '#d8d2c4', '#8f867a'];
    for (let i = 0; i < N; i++) {
      const x = (rnd() - 0.5) * 104, z = (rnd() - 0.5) * 24;
      const h = 0.4 + rnd() * 2.6;
      v.set(x, h / 2, z);
      q.setFromEuler(new THREE.Euler(0, rnd() * Math.PI, (rnd() - 0.5) * 0.35));
      s.set(3 + rnd() * 9, h, 2 + rnd() * 7);
      m4.compose(v, q, s);
      im.setMatrixAt(i, m4);
      col.set(pal[(rnd() * pal.length) | 0]);
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true;
    im.scale.y = 0;
    scene.add(im);
    return im;
  }

  // ---------- 新楼升起的火焰 / 闪光 ----------
  function buildRiseFx() {
    const fl = new THREE.PointLight(0xffb04a, 0, 300);
    fl.position.set(0, 8, 0); scene.add(fl);
    fx.lights.push(fl); fx.riseLight = fl;

    const flash = addAdditive(new THREE.SphereGeometry(1, 16, 12), 0xfff0cf, 0);
    flash.position.set(0, 3, 0); flash.scale.setScalar(6);
    fx.meshes.push(flash); fx.riseFlash = flash;

    const glow = addAdditive(new THREE.RingGeometry(3, 30, 56), 0xff9a3c, 0);
    glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.7, 0);
    fx.meshes.push(glow); fx.glow = glow;

    // 沿楼体轮廓的火焰柱
    fx.flames = [];
    for (let i = 0; i < 14; i++) {
      const g = i < 10
        ? new THREE.BoxGeometry(6 + rnd() * 8, 1, 10)
        : new THREE.BoxGeometry(14 + rnd() * 10, 1, 3);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xffd27a : (i % 3 === 1 ? 0xff8f2e : 0xff5a12),
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      const x = -52 + (i < 10 ? i * 11.5 : rnd() * 100 - 50);
      const z = i < 10 ? (i % 2 ? -13.5 : 13.5) : (rnd() - 0.5) * 26;
      m.position.set(x, 2 + rnd() * 3, z);
      m.userData = { base: m.position.y, ph: rnd() * 6.28, amp: 0.6 + rnd() * 0.9 };
      m.scale.y = 4 + rnd() * 8;
      scene.add(m);
      fx.meshes.push(m); fx.flames.push(m);
    }
  }

  // ---------- 每帧 ----------
  function update(dt) {
    if (!playing) return;
    t += dt;

    // 1) 飞机逼近
    if (t >= T.planeIn && t < T.impact && plane) {
      plane.visible = true;
      const k = clamp01((t - T.planeIn) / (T.impact - T.planeIn));
      plane.position.lerpVectors(START, IMPACT, k);
      plane.position.y += Math.sin(k * Math.PI) * 12;      // 轻微弧线
    }

    // 2) 撞击
    if (t >= T.impact && !fx.started) {
      fx.started = true;
      if (plane) plane.visible = false;
      explode();
    }

    // 3) 特效推进
    if (fx.started) {
      const e = t - T.impact;
      if (fx.flash) {
        const k = clamp01(e / 0.5);
        fx.flash.scale.setScalar(2 + k * 72);
        fx.flash.material.opacity = 1 - k;
        if (fx.lights[0]) fx.lights[0].intensity = 12 * (1 - k);
      }
      if (fx.fire) {
        const k = clamp01(e / 1.7);
        fx.fire.scale.setScalar(6 + k * 36);
        fx.fire.material.opacity = 0.95 * (1 - k);
      }
      if (fx.blobs) {
        const k = clamp01(e / 1.5);
        fx.blobs.forEach((b, i) => {
          b.scale.setScalar(3 + k * (12 + i * 3));
          b.material.opacity = 0.85 * (1 - k);
        });
      }
      if (fx.ring) {
        const k = clamp01(e / 1.3);
        fx.ring.scale.setScalar(3 + k * 78);
        fx.ring.material.opacity = 0.8 * (1 - k);
      }
      if (fx.dust) {
        const k = clamp01(e / 3.0);
        fx.dust.scale.set(8 + k * 52, 5 + k * 26, 8 + k * 40);
        fx.dust.material.opacity = 0.5 * (1 - k * 0.85);
      }
      // 碎片飞行
      if (fx.debris) {
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(),
              s = new THREE.Vector3(), eu = new THREE.Euler();
        fx.debrisData.forEach((d, i) => {
          d.v.y -= 42 * dt;
          d.p.addScaledVector(d.v, dt);
          if (d.p.y < 0.4) { d.p.y = 0.4; d.v.set(0, 0, 0); }
          d.r.x += dt * 2.2; d.r.z += dt * 1.7;
          eu.set(d.r.x, d.r.y, d.r.z);
          q.setFromEuler(eu);
          v.copy(d.p); s.setScalar(d.s);
          m4.compose(v, q, s);
          fx.debris.setMatrixAt(i, m4);
        });
        fx.debris.instanceMatrix.needsUpdate = true;
        const fk = clamp01((e - 1.6) / 1.4);
        fx.debris.material.transparent = true;
        fx.debris.material.opacity = 1 - fk;
        if (fk >= 1) fx.debris.visible = false;
      }
      // 废墟显形
      if (fx.rubble) {
        const k = clamp01((e - 0.9) / 1.1);
        fx.rubble.scale.y = Math.max(0.02, k);
        fx.rubble.visible = k > 0;
      }
    }

    // 4) 楼体坍塌（逐层）
    if (fx.started && !fx.riseBuilt) {
      for (const tg of targets) {
        const k = clamp01((t - T.impact - tg.delay) / T.collapse);
        if (k <= 0) continue;
        if (tg.kind === 'tower') {
          tg.g.scale.y = 1 - 0.965 * k;
          tg.g.position.y = -2.4 * k;
        } else {
          tg.g.position.y = -36 * k;
        }
      }
    }

    // 5) 新楼升起
    if (t >= T.riseFlash && !fx.riseBuilt) {
      fx.riseBuilt = true;
      buildRiseFx();
      for (const tg of targets) {                       // 复位到地下，全新完好
        tg.g.scale.y = 1; tg.g.scale.x = 1; tg.g.scale.z = 1;
        tg.g.position.y = -SINK_FROM;
      }
      if (fx.rubble) fx.rubble.visible = false;
    }
    if (t >= T.riseStart && t < T.restore) {
      const u = clamp01((t - T.riseStart) / T.riseDur);
      const y = -SINK_FROM * (1 - easeOut(u));
      for (const tg of targets) tg.g.position.y = y;
      if (fx.riseFlash) {
        const k = clamp01((t - T.riseFlash) / 0.9);
        fx.riseFlash.scale.setScalar(6 + k * 70);
        fx.riseFlash.material.opacity = 0.95 * (1 - k);
        if (fx.riseLight) fx.riseLight.intensity = 10 * (1 - k);
      }
      if (fx.glow) {
        const k = clamp01((t - T.riseStart) / T.riseDur);
        fx.glow.material.opacity = 0.75 * Math.sin(k * Math.PI);
      }
      if (fx.riseLight) fx.riseLight.intensity = Math.max(fx.riseLight.intensity, 3.4 * Math.sin(clamp01((t - T.riseStart) / T.riseDur) * Math.PI));
      // 火焰柱：随楼体升起拉伸、抖动、收尾熄灭
      const fade = 1 - clamp01((t - (T.riseStart + T.riseDur - 0.5)) / 1.1);
      for (const f of fx.flames) {
        const u2 = clamp01((t - T.riseStart) / T.riseDur);
        f.scale.y = (4 + f.userData.amp * 10) * (0.35 + u2);
        f.position.y = f.userData.base + u2 * 8 + Math.sin(t * 9 + f.userData.ph) * 1.8;
        f.material.opacity = Math.max(0, 0.85 * fade * (0.55 + 0.45 * Math.sin(t * 15 + f.userData.ph)));
      }
    }

    // 6) 收尾：一切恢复正常
    if (t >= T.restore) {
      for (const tg of targets) { tg.g.scale.set(1, 1, 1); tg.g.position.y = 0; }
      restore();
    }
  }

  function restore() {
    playing = false;
    if (fx) {
      for (const o of fx.meshes) { scene.remove(o); o.geometry.dispose(); o.material.dispose(); }
      for (const l of fx.lights) scene.remove(l);
      if (fx.debris) { scene.remove(fx.debris); fx.debris.geometry.dispose(); fx.debris.material.dispose(); }
      if (fx.rubble) { scene.remove(fx.rubble); fx.rubble.geometry.dispose(); fx.rubble.material.dispose(); }
      for (const f of fx.flames) { scene.remove(f); f.geometry.dispose(); f.material.dispose(); }
      if (fx.glow) { scene.remove(fx.glow); fx.glow.geometry.dispose(); fx.glow.material.dispose(); }
      fx = null;
    }
    if (plane) {
      scene.remove(plane);
      plane.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      plane = null; planeParts = [];
    }
    document.body.classList.remove('egg-on');
    controls.enabled = true;
    if (onUserGrab) { controls.removeEventListener('start', onUserGrab); onUserGrab = null; }

    // 恢复用户触发前的状态
    if (snap) {
      ctx.ui.setTheme(snap.theme);
      ctx.ui.setGlass(snap.glass);
      ctx.ui.setAll((id) => snap.visible.has(id));
      if (state.lang !== snap.lang) { state.lang = snap.lang; ctx.ui.refreshTexts(); }
      ctx.demo.flyTo({ pos: snap.camPos.toArray(), tgt: snap.camTgt.toArray() });
      snap = null;
    }
    count = 0; langBefore = null;
  }

  return { update, isPlaying: () => playing };
}
