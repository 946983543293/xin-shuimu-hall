// 主题系统：图纸（浅）/ 夜航（深），同一套几何只换材质与环境
import * as THREE from 'three';
import { CONFIG } from '../building.config.js';

const C = CONFIG.colors;

export function createMaterials() {
  const capsuleTex = makeCapsuleFacadeTexture();
  return {
    // 实体（顶点色合并网格：楼板/核心/大空间/基座/地下）
    solid: new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xffffff }),
    // 舱体（InstancedMesh，instanceColor 提供木色微差）
    capsule: new THREE.MeshLambertMaterial({ color: 0xffffff }),
    // 舱体外廊立面片（门+窗贴图，instanceColor 染色）
    facade: new THREE.MeshLambertMaterial({ map: capsuleTex, color: 0xffffff }),
    // 玻璃幕墙（共享单一材质，透明度滑块统一控制）
    glass: new THREE.MeshLambertMaterial({
      color: 0xbfd9e8, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false,
    }),
    // 细线描边
    edge: new THREE.LineBasicMaterial({ color: C.ink }),
    // 机械（横梁/小车）
    mech: new THREE.MeshLambertMaterial({ color: C.accentRust }),
    mechDark: new THREE.MeshLambertMaterial({ color: 0x6b5b4a }),
    // 夜航灯光（Basic 自发光，默认隐藏由主题切换）
    corridorLight: new THREE.MeshBasicMaterial({ color: 0xffe0b3 }),
    windowLit: new THREE.MeshBasicMaterial({ color: 0xffc978 }),
    lampGlow: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
    lampPool: new THREE.MeshBasicMaterial({
      color: 0xffd9a0, transparent: true, opacity: 0.24,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  };
}

// 舱体外廊立面贴图：白底 + 深色窗带 + 门（instanceColor 染木色后门窗保持深色）
function makeCapsuleFacadeTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  // 窗（1.8×1.1，偏左）
  g.fillStyle = '#33404c'; g.fillRect(16, 26, 66, 40);
  g.fillStyle = '#5a7080'; g.fillRect(20, 30, 58, 32);
  // 门（右侧 0.9×2.0）
  g.fillStyle = '#8a7968'; g.fillRect(92, 40, 26, 82);
  g.strokeStyle = '#4a3f34'; g.lineWidth = 2; g.strokeRect(92, 40, 26, 82);
  g.fillStyle = '#3a352e'; g.fillRect(96, 76, 3, 10); // 把手
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function applyTheme(name, env) {
  const { scene, mats, hemi, sun, ground, grid, sky, built } = env;
  const night = name === 'night';
  scene.background = new THREE.Color(night ? C.night : C.paper);
  scene.fog = night ? new THREE.Fog(C.night, 260, 520) : new THREE.Fog(C.paper, 340, 700);

  // 天空穹顶纹理切换（昼：太阳+云 / 夜：星空+月）
  if (sky) sky.material.map = night ? sky.userData.night : sky.userData.day;
  // 夜航灯光组：走廊灯带 / 舱体亮窗 / 路灯光球与光晕
  if (built) {
    for (const { group } of built.levels.values())
      (group.userData.night || []).forEach((m) => (m.visible = night));
    (built.site.userData.night || []).forEach((m) => (m.visible = night));
  }

  mats.solid.color.set(night ? 0x7e8da1 : 0xffffff);
  mats.capsule.color.set(night ? 0x8f9dac : 0xffffff);
  mats.facade.color.set(night ? 0x8f9dac : 0xffffff);
  // 夜航：舱体透出暖窗光（整体提亮）
  mats.capsule.emissive = new THREE.Color(night ? 0x3a2412 : 0x000000);
  mats.facade.emissive = new THREE.Color(night ? 0x452c14 : 0x000000);
  mats.solid.emissive = new THREE.Color(night ? 0x0e1824 : 0x000000);
  mats.glass.color.set(night ? C.nightEdge : 0xbfd9e8);
  mats.glass.emissive = new THREE.Color(night ? 0x0d2a24 : 0x000000);
  mats.edge.color.set(night ? C.nightEdge : C.ink);
  mats.mech.color.set(night ? 0xd96a4a : C.accentRust);

  hemi.color.set(night ? 0x51698a : 0xfff8ec);
  hemi.groundColor.set(night ? 0x1f2a36 : 0xd8d2c4);
  hemi.intensity = night ? 2.0 : 1.1;
  sun.color.set(night ? 0xc3dcef : 0xfff2df);
  sun.intensity = night ? 1.45 : 1.6;

  ground.material.color.set(night ? 0x1e262f : 0xe9eae0);
  grid.material.color.set(night ? 0x3d4e61 : 0xcfc8ba);

  document.body.classList.toggle('night', night);
}
