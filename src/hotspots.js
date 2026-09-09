// 热点标注：关键部位脉冲点 + 点击信息卡（中英双语）
import * as THREE from 'three';
import { CSS2DObject } from '../lib/CSS2DRenderer.js';

const HOTSPOTS = [
  {
    id: 'gantry', attach: null, pos: [4.5, 70.6, 0], // 场景级：横梁屋顶停机位
    title: { zh: '龙门吊式舱体搬运系统', en: 'Gantry Capsule System' },
    desc: {
      zh: '双立柱贯通 B2–屋顶 + 57m 通长横梁 + 伸缩机械臂。单舱更换 <10 分钟；人走外廊、舱走槽井，人货完全分离。',
      en: 'Twin masts (B2 to roof) + 57m beam + telescopic arm. One capsule swap <10 min. People use corridors, capsules use the slot — fully separated.',
    },
  },
  {
    id: 'hall', attach: 'F9', pos: [-30.5, 33.4, 0], // 世界坐标（楼层组在原点，挂组仅为随层显隐）
    title: { zh: '书院大客厅（9F+10F 通高）', en: 'Grand Hall (9F+10F)' },
    desc: {
      zh: '两层通高 7.2m，全院节庆、讲座、电影夜。居中楼层服务半径最均；固定功能，不参与学期级投票。',
      en: '7.2m double-height space for festivals, lectures and movie nights. Centrally located; fixed program, exempt from voting.',
    },
  },
  {
    id: 'slot', attach: 'F8', pos: [12, 29.4, 4.4],
    title: { zh: '功能舱空位（每层唯一）', en: 'Function Slot (one per floor)' },
    desc: {
      zh: '6×4m 空位，南北错层交替。琴房/厨房/游戏舱等 14 种功能舱日级预约、当日到位；临槽面设电动防火卷帘。',
      en: '6×4m slot, alternating N/S by floor. 14 capsule types bookable same-day via app; fire shutter on the slot face.',
    },
  },
  {
    id: 'capsule', attach: 'F8', pos: [-10.5, 29.3, 6.3],
    title: { zh: '单人居住舱 3.0×4.0m', en: 'Living Capsule 3.0×4.0m' },
    desc: {
      zh: '独立卫浴，门朝外廊。月级"搬家窗口"可换楼层、换朝向、换邻居——舱体是自己的。',
      en: 'Private bath, door to the corridor. Monthly move window: change floor, orientation or neighbors — the capsule is yours.',
    },
  },
  {
    id: 'yard', attach: 'B2', pos: [-49.5, -9.8, 0],
    title: { zh: '下沉庭院 · B2 运动场馆层', en: 'Sunken Court · B2 Sports' },
    desc: {
      zh: '游泳馆 + 篮球馆（划线兼容羽毛球/排球），对全校分时开放；下沉庭院解决地下采光通风与消防疏散。',
      en: 'Pool + basketball court (badminton/volleyball compatible), open to campus by schedule; sunken court brings daylight and ventilation.',
    },
  },
  {
    id: 'hero', attach: null, pos: [62, 3.9, 16],
    title: { zh: '样板舱 1:1', en: 'Mock-up Capsule 1:1' },
    desc: {
      zh: '床 / 桌 / 衣柜 / 书架 / 独立卫浴盒，净高 3.0m。预制干法装配，水电新风快插接口。',
      en: 'Bed, desk, wardrobe, shelf, bath pod in 3.0m clear height. Prefab dry assembly with quick-connect utilities.',
    },
  },
];

export function initHotspots(ctx) {
  const { scene, built, state } = ctx;

  // 信息卡 DOM
  const card = document.createElement('div');
  card.id = 'info-card';
  card.innerHTML = '<button id="info-close">×</button><h3></h3><p></p>';
  card.style.display = 'none';
  document.body.appendChild(card);
  card.querySelector('#info-close').addEventListener('click', () => (card.style.display = 'none'));

  let current = null;
  function open(h) {
    current = h;
    card.querySelector('h3').textContent = h.title[state.lang];
    card.querySelector('p').textContent = h.desc[state.lang];
    card.style.display = 'block';
  }

  const sceneDots = [];
  for (const h of HOTSPOTS) {
    const div = document.createElement('div');
    div.className = 'hotspot-dot';
    div.style.pointerEvents = 'auto';
    div.addEventListener('click', (e) => { e.stopPropagation(); open(h); });
    const obj = new CSS2DObject(div);
    obj.position.set(...h.pos);
    if (h.attach && built.levels.has(h.attach)) built.levels.get(h.attach).group.add(obj);
    else { scene.add(obj); sceneDots.push(obj); }
  }

  return {
    refresh() {
      if (current && card.style.display !== 'none') open(current);
    },
    setSceneVisible(v) { sceneDots.forEach((o) => (o.visible = v)); },
  };
}
