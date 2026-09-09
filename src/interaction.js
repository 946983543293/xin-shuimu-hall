// 演示层：预设机位漫游 + 横梁吊舱动画（P1 核心演示）
import * as THREE from 'three';
import { CONFIG } from '../building.config.js';

// ---------- 预设机位（对应答辩故事线）----------
export const PRESETS = [
  { id: 'presetAerial',  pos: [125, 85, 130], tgt: [0, 26, 0] },
  { id: 'presetSouth',   pos: [0, 38, 178],   tgt: [0, 33, 0] },
  { id: 'presetSection', pos: [62, 62, 42],   tgt: [0, 26, 0] },
  { id: 'presetFloor',   pos: [28, 30, 88],   tgt: [4, 26, 0] },
  { id: 'presetPodium',  pos: [0, 150, 78],   tgt: [0, 4, 0] },
];

const BEAM_HOME_Y = 68.6;     // 屋顶停机位
const TROLLEY_HOME_X = -18;   // 横梁局部坐标
// 演示目标：8F 功能舱空位（南排第 12–13 位，阳面，默认机位正对）
const DEMO = (() => {
  const base = 9.6 + (8 - 3) * 3.6; // 8F 底标高 27.6
  return {
    floorBase: base,
    beamY: base + 3.6 + 1.2,        // 32.4（横梁中心）
    capRestY: base + 0.3 + 1.5,     // 29.4（舱体落位中心）
    trolleyX: 12.0 - 4.5,           // 空位世界 x=12 → 横梁局部 7.5
    slotPushZ: 6.1,                 // 推入南排
  };
})();

export function initDemo(ctx) {
  const { camera, controls, built, mats } = ctx;

  // 演示舱体（功能舱，暖木色）
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.capsule.w, CONFIG.capsule.h, CONFIG.capsule.d),
    new THREE.MeshLambertMaterial({ color: 0xc8956c })
  );
  cap.add(new THREE.LineSegments(new THREE.EdgesGeometry(cap.geometry), mats.edge));
  cap.visible = false;
  ctx.scene.add(cap);

  const { beam, trolley, arm } = built.mech;

  // ---------- 相机补间 ----------
  let camTween = null;
  function flyTo(presetIdOrView) {
    const p = typeof presetIdOrView === 'string'
      ? PRESETS.find((x) => x.id === presetIdOrView)
      : presetIdOrView; // 也接受 { pos:[...], tgt:[...] }
    if (!p) return;
    camTween = {
      t: 0, dur: 1.4,
      fromP: camera.position.clone(), toP: new THREE.Vector3(...p.pos),
      fromT: controls.target.clone(), toT: new THREE.Vector3(...p.tgt),
    };
  }

  // ---------- 横梁动画状态机 ----------
  // 阶段：降梁 → 小车对位 → 伸臂 → 推舱入位 → 收臂 → 小车回 → 升梁 → 结束
  const phases = [
    { dur: 3.0, fn: (k) => { beam.position.y = THREE.MathUtils.lerp(BEAM_HOME_Y, DEMO.beamY, k); } },
    { dur: 1.6, fn: (k) => { trolley.position.x = THREE.MathUtils.lerp(TROLLEY_HOME_X, DEMO.trolleyX, k); arm.position.x = trolley.position.x; } },
    { dur: 0.8, fn: (k) => { arm.scale.y = 1 + k * 0.9; arm.position.y = -2.8 - k * 1.1; } },
    { dur: 1.6, fn: (k) => { cap.position.z = THREE.MathUtils.lerp(0, DEMO.slotPushZ, k); } },
    { dur: 0.8, fn: (k) => { arm.scale.y = 1.9 - k * 0.9; arm.position.y = -3.9 + k * 1.1; } },
    { dur: 1.6, fn: (k) => { trolley.position.x = THREE.MathUtils.lerp(DEMO.trolleyX, TROLLEY_HOME_X, k); arm.position.x = trolley.position.x; } },
    { dur: 3.0, fn: (k) => { beam.position.y = THREE.MathUtils.lerp(DEMO.beamY, BEAM_HOME_Y, k); } },
    { dur: 2.0, fn: () => {} }, // 舱体落位展示
  ];
  let anim = null;

  function playBeam() {
    if (anim) return;
    anim = { phase: 0, t: 0 };
    cap.visible = true;
    cap.position.set(beam.position.x + TROLLEY_HOME_X, BEAM_HOME_Y - 3.0, 0);
  }
  function stopBeam() {
    anim = null;
    cap.visible = false;
    beam.position.y = BEAM_HOME_Y;
    trolley.position.x = TROLLEY_HOME_X; arm.position.x = TROLLEY_HOME_X;
    arm.scale.y = 1; arm.position.y = -2.8;
  }

  function update(dt) {
    // 相机
    if (camTween) {
      camTween.t += dt / camTween.dur;
      const k = ease(Math.min(camTween.t, 1));
      camera.position.lerpVectors(camTween.fromP, camTween.toP, k);
      controls.target.lerpVectors(camTween.fromT, camTween.toT, k);
      if (camTween.t >= 1) camTween = null;
    }
    // 横梁
    if (anim) {
      const ph = phases[anim.phase];
      anim.t += dt / ph.dur;
      const k = ease(Math.min(anim.t, 1));
      ph.fn(k);
      // 舱体在未推入前始终挂在梁下（阶段 0–2），阶段 3 起 z 由推舱函数控制
      if (anim.phase <= 2) {
        cap.position.x = beam.position.x + trolley.position.x;
        cap.position.y = beam.position.y - 3.0;
        cap.position.z = 0;
      } else if (anim.phase === 3) {
        cap.position.x = beam.position.x + DEMO.trolleyX;
        cap.position.y = DEMO.capRestY;
      }
      if (anim.t >= 1) {
        anim.phase++;
        anim.t = 0;
        if (anim.phase >= phases.length) {
          anim = null;
          cap.visible = false; // 复位（舱体"已入驻"，演示舱收回）
          if (ctx.onBeamEnd) ctx.onBeamEnd();
        }
      }
    }
  }

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  return { flyTo, playBeam, stopBeam, update, isPlaying: () => !!anim, cancelFlight: () => (camTween = null) };
}
