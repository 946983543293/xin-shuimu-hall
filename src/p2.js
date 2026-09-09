// P2 演示层：日级召唤全流程 + 立面生长动画 + 数据面板
// 全流程复用 P1 的横梁动画状态机思路，扩展 6 阶段并加字幕条
import * as THREE from 'three';
import { CONFIG } from '../building.config.js';

const S = CONFIG.STRINGS;

const BEAM_HOME_Y = 68.6;
const TROLLEY_HOME_X = -18;
// 目标：8F 南排功能空位（与 P1 演示同一空位，xz 由 geometry 的常量推得）
const TGT = {
  floorBase: 9.6 + (8 - 3) * 3.6,   // 27.6
  beamY: 27.6 + 3.6 + 1.2,          // 32.4
  capRestY: 27.6 + 0.3 + 1.5,       // 29.4
  trolleyX: 12.0 - 4.5 - 4.5,       // 横梁局部（beamGroup 在 x=4.5）
  slotPushZ: 6.1,
};
// 西立柱井中心（世界）x=-21.5, z=0；B1 地坪 -4.5；3F 底 9.6
const LIFT = { x: -21.5, z: 0, y0: -4.5, y1: 9.6 + 1.5 };

export function initP2(ctx) {
  const { scene, camera, controls, built, mats } = ctx;

  /* ================= A. 日级召唤全流程 ================= */
  const flowCap = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.capsule.w, CONFIG.capsule.h, CONFIG.capsule.d),
    new THREE.MeshLambertMaterial({ color: 0xc8956c })
  );
  flowCap.add(new THREE.LineSegments(new THREE.EdgesGeometry(flowCap.geometry), mats.edge));
  flowCap.visible = false;
  scene.add(flowCap);

  // 字幕条
  const subBar = document.createElement('div');
  subBar.id = 'sub-bar';
  document.body.appendChild(subBar);

  const { beam, trolley, arm } = built.mech;

  // 阶段表（相对时长，字幕由 idx 驱动）
  const SUBS = ['subB1', 'subLift', 'subBeam', 'subArm', 'subIn', 'subDone'];
  const flow = [
    // ① B1 出库：舱体从储存货架平移到立柱井
    { dur: 2.2, fn: (k, e) => {
        flowCap.position.x = THREE.MathUtils.lerp(-14, LIFT.x, e);
        flowCap.position.z = THREE.MathUtils.lerp(-6, LIFT.z, e);
      } },
    // ② 垂直平台：沿井升至 3F 交接高度
    { dur: 2.6, fn: (k, e) => {
        flowCap.position.y = THREE.MathUtils.lerp(LIFT.y0, LIFT.y1, e);
      } },
    // ③ 横梁交接：梁降到 3F 接舱 → 挂舱升至 8F
    { dur: 3.2, fn: (k, e) => {
        if (k < 0.3) {
          beam.position.y = THREE.MathUtils.lerp(BEAM_HOME_Y, LIFT.y1 + 3.0, k / 0.3);
        } else {
          const k2 = (k - 0.3) / 0.7;
          beam.position.y = THREE.MathUtils.lerp(LIFT.y1 + 3.0, TGT.beamY, k2);
        }
        flowCap.position.set(LIFT.x + trolley.position.x, beam.position.y - 3.0, LIFT.z);
      } },
    // ④ 小车+机械臂对位到目标空位上方
    { dur: 1.8, fn: (k, e) => {
        trolley.position.x = THREE.MathUtils.lerp(TROLLEY_HOME_X, TGT.trolleyX, e);
        arm.position.x = trolley.position.x;
        arm.scale.y = 1 + e * 0.9; arm.position.y = -2.8 - e * 1.1;
        flowCap.position.x = beam.position.x + trolley.position.x;
        flowCap.position.y = beam.position.y - 3.0;
      } },
    // ⑤ 推送入位（南排）
    { dur: 1.8, fn: (k, e) => {
        flowCap.position.z = THREE.MathUtils.lerp(LIFT.z, TGT.slotPushZ, e);
        flowCap.position.y = THREE.MathUtils.lerp(beam.position.y - 3.0, TGT.capRestY, Math.min(1, e * 1.6));
      } },
    // ⑥ 收臂复位
    { dur: 2.6, fn: (k, e) => {
        arm.scale.y = 1.9 - e * 0.9; arm.position.y = -3.9 + e * 1.1;
        if (k > 0.4) trolley.position.x = THREE.MathUtils.lerp(TGT.trolleyX, TROLLEY_HOME_X, (k - 0.4) / 0.6);
        if (k > 0.4) arm.position.x = trolley.position.x;
      } },
  ];
  let flowAnim = null;
  function playFlow() {
    if (flowAnim) return;
    flowAnim = { phase: 0, t: 0 };
    flowCap.visible = true;
    flowCap.position.set(-14, -4.5 + 1.5, -6);
    setSub(0);
  }
  function stopFlow() {
    flowAnim = null;
    flowCap.visible = false;
    subBar.classList.remove('show');
    beam.position.y = BEAM_HOME_Y;
    trolley.position.x = TROLLEY_HOME_X; arm.position.x = TROLLEY_HOME_X;
    arm.scale.y = 1; arm.position.y = -2.8;
  }
  function setSub(i) {
    subBar.textContent = S[SUBS[i]][ctx.state.lang];
    subBar.classList.add('show');
  }
  function updateFlow(dt) {
    if (!flowAnim) return;
    const ph = flow[flowAnim.phase];
    flowAnim.t += dt / ph.dur;
    const k = Math.min(flowAnim.t, 1);
    ph.fn(k, k * k * (3 - 2 * k));
    if (flowAnim.t >= 1) {
      flowAnim.phase++; flowAnim.t = 0;
      if (flowAnim.phase >= flow.length) {
        // 完：字幕停在最后一步，舱体留位 2 秒后自动复位
        setSub(SUBS.length - 1);
        flowAnim = null;
        if (ctx.onFlowEnd) ctx.onFlowEnd();
        setTimeout(() => stopFlow(), 2000);
      } else setSub(flowAnim.phase);
    }
  }

  /* ================= B. 立面生长动画 ================= */
  // 收集每层 InstancedMesh（capMesh 为 group 内首个 InstancedMesh）
  const layers = [];
  for (const [id, lv] of built.levels) {
    if (!id.startsWith('F') || parseInt(id.slice(1)) < 3) continue;
    const im = lv.group.children.find((c) => c.isInstancedMesh && c.count > 20);
    if (im) layers.push({ id, im, total: im.count });
  }
  layers.sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));

  // 隐藏用：把实例矩阵 scale 置 0；插入时从槽上方落下
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), v0 = new THREE.Vector3();
  const zero = new THREE.Vector3(0.0001, 0.0001, 0.0001);

  let grow = null;
  function playGrowth() {
    if (grow) return;
    grow = { li: 0, ki: 0, total: layers.reduce((s, l) => s + l.total, 0), done: 0 };
    // 全部隐藏
    for (const l of layers) {
      for (let k = 0; k < l.total; k++) {
        l.im.getMatrixAt(k, m4);
        m4.decompose(v0, q0, one);
        m4.compose(v0, q0, zero);
        l.im.setMatrixAt(k, m4);
      }
      l.im.instanceMatrix.needsUpdate = true;
    }
    growBar.classList.add('show');
    growBar.querySelector('#grow-n').textContent = 0;
  }
  function stopGrowth() {
    if (!grow) return;
    grow = null;
    restoreAllCapsules();
    growBar.classList.remove('show');
  }
  // 全量恢复（停止生长 / 3D 页兜底）
  function restoreAllCapsules() {
    for (const l of layers) {
      for (let k = 0; k < l.total; k++) restoreInstance(l, k);
      l.im.instanceMatrix.needsUpdate = true;
    }
  }
  // 恢复某实例（需要原始位置：从矩阵反解不可行，重算）
  // 方案：growth 用 visible 反而会整层闪现 —— 改用逐实例恢复：
  // 由于 setMatrixAt 已破坏原矩阵，这里按 geometry 同款公式重算位置
  function restoreInstance(l, k) {
    // 与 geometry.js 一致的重算（每层 34 位，含功能空位 2 位跳过）
    const f = parseInt(l.id.slice(1));
    const base = 9.6 + (f - 3) * 3.6;
    const start = CONFIG.capsule.funcSlotStartPos + ((f - 3) % 9);
    const fsRow = f % 2 === 1 ? 'N' : 'S';
    let idx = 0;
    for (const row of ['N', 'S']) {
      for (let i = 1; i <= 17; i++) {
        if (row === fsRow && (i === start || i === start + 1)) continue;
        if (idx === k) {
          const y = base + 0.3 + CONFIG.capsule.h / 2;
          const zc = row === 'N' ? -6.1 : 6.1;
          const x = -24 + (i - 1) * 3 + 1.5;
          m4.compose(v0.set(x, y, zc), q0.identity(), one);
          l.im.setMatrixAt(k, m4);
          l.im.instanceMatrix.needsUpdate = true;
          return;
        }
        idx++;
      }
    }
  }

  const growBar = document.createElement('div');
  growBar.id = 'grow-bar';
  growBar.innerHTML = `<span id="grow-n"></span> <span data-i18n-p2="growthCap"></span>`;
  document.body.appendChild(growBar);

  function updateGrowth(dt) {
    if (!grow) return;
    // 速率：每秒约 28 舱（512 舱 ≈ 18 秒），波纹从下到上
    let n = Math.max(1, Math.round(dt * 28));
    while (n-- > 0) {
      const l = layers[grow.li];
      if (!l) { // 全部完成
        growBar.classList.remove('show');
        grow = null;
        if (ctx.onGrowthEnd) ctx.onGrowthEnd();
        return;
      }
      restoreInstance(l, grow.ki);
      grow.ki++; grow.done++;
      growBar.querySelector('#grow-n').textContent = grow.done;
      if (grow.ki >= l.total) { grow.li++; grow.ki = 0; }
    }
  }

  /* ================= C. 数据面板 ================= */
  const dp = document.createElement('div');
  dp.id = 'data-panel';
  dp.innerHTML = `
    <button id="dp-close">×</button>
    <h3 data-i18n-p2="dataTitle"></h3>
    <div class="dp-row">
      <div class="dp-cell"><b>512</b><span data-i18n-p2="dPeople"></span></div>
      <div class="dp-cell"><b>16</b><span data-i18n-p2="dFloors"></span></div>
      <div class="dp-cell"><b>34</b><span data-i18n-p2="dSlots"></span></div>
    </div>
    <div class="dp-sec" data-i18n-p2="dQuota"></div>
    <div class="dp-quota">
      <span class="q hall"></span><i>2F*</i>
      <span class="q gym"></span><i>3</i>
      <span class="q lib"></span><i>3</i>
      <span class="q reh"></span><i>2</i>
      <span class="q study"></span><i>6</i>
    </div>
    <div class="dp-sec" data-i18n-p2="dHeat"></div>
    <div class="dp-heat" id="dp-heat"></div>
    <div class="dp-sec" data-i18n-p2="dTop"></div>
    <div class="dp-top" data-i18n-p2="dTopList"></div>
    <div class="dp-note" data-i18n-p2="dNote"></div>`;
  document.body.appendChild(dp);

  // 热力图（16×6，模式化数据与小程序一致）
  (function buildHeat() {
    const box = dp.querySelector('#dp-heat');
    for (let f = 18; f >= 3; f--) {
      const row = document.createElement('div');
      row.className = 'hrow';
      row.appendChild(Object.assign(document.createElement('i'), { textContent: f + 'F' }));
      for (let c = 0; c < 6; c++) {
        let v = ((f * 37 + c * 13) % 30) / 100;
        if ((f === 5 || f === 11 || f === 16) && c >= 4) v += .62;
        if ((f === 4 || f === 8 || f === 13) && (c === 2 || c === 3)) v += .55;
        if ((f === 7 || f === 15) && c === 5) v += .5;
        if (f === 9 || f === 10) v = 0.03;
        v = Math.min(1, v);
        const d = document.createElement('span');
        d.style.opacity = (0.15 + v * 0.85).toFixed(2);
        row.appendChild(d);
      }
      box.appendChild(row);
    }
  })();

  function showData() { dp.classList.add('show'); }
  function hideData() { dp.classList.remove('show'); }
  dp.querySelector('#dp-close').addEventListener('click', hideData);

  // i18n（data-i18n-p2 属性）
  function refreshP2Texts() {
    const L = ctx.state.lang;
    document.querySelectorAll('[data-i18n-p2]').forEach((e) => {
      const k = e.dataset.i18nP2;
      if (S[k]) e.textContent = S[k][L];
    });
    if (flowAnim) setSub(0); // 字幕下次 update 会刷新，此处略
  }

  function update(dt) {
    updateFlow(dt);
    updateGrowth(dt);
  }

  return {
    playFlow, stopFlow, update, refreshP2Texts,
    isFlowPlaying: () => !!flowAnim,
    playGrowth, stopGrowth, isGrowing: () => !!grow, restoreAllCapsules,
    showData, hideData,
  };
}
