// ============================================================
// 校园人群：低模小人（球头 / 圆柱身 / 圆棍四肢 + 简单配饰）
// 白天多、夜晚少；独行 / 结伴 / 驻足交谈；只在有地面且非楼层导引时出现
// 全部小人用 6 个 InstancedMesh 绘制（约 6 次 draw call）
// ============================================================
import * as THREE from 'three';
import { CSS2DObject } from '../lib/CSS2DRenderer.js';

const N = 64;                       // 小人总数（池）
const DAY_RATIO = 1.0;              // 白天出现比例
const NIGHT_RATIO = 0.26;           // 夜晚出现比例

// 彩蛋：小树林里约会的小情侣（一男一女，凑得很近交谈，头顶时不时冒小爱心）
// 位置取自东侧树最密的树丛（12 棵），距最近树干 4.4m —— 见计算注释
const DATE = {
  male:   { x: 86.28, z: -59.48 },
  female: { x: 86.72, z: -58.78 },
  y: 0.05,                          // 绿地顶面
};

// 校园可行走范围（避开基座体量）
const BX = 60, BZ = 17;             // 建筑外扩矩形
const BOUND = { x0: -155, x1: 155, z0: -92, z1: 100 };

const SHIRT = ['#C86A2E', '#2E6EA6', '#1F5C4D', '#A6462E', '#8F6B4A', '#6E7E8C',
               '#B98A5A', '#7E9B6A', '#C9A227', '#5A6B7A', '#8A6BA6', '#3F7E8C'];
const PANTS = ['#3A4149', '#4A4038', '#2F3944', '#5A5148', '#42505C'];
const SKIN = ['#E8C39E', '#DCB08A', '#C99B72', '#F0D3B4'];
const HAT = ['#2F3944', '#A6462E', '#1F5C4D', '#3A4149', '#6E7E8C'];

export function initCrowd(ctx) {
  const { scene, built, state } = ctx;

  // 独立随机源（固定种子，保证每次打开一致）
  let seed = 20260911;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (a) => a[(rnd() * a.length) | 0];

  const valid = (x, z) => !(Math.abs(x) < BX && Math.abs(z) < BZ);
  function randomPoint() {
    for (let i = 0; i < 40; i++) {
      const x = BOUND.x0 + rnd() * (BOUND.x1 - BOUND.x0);
      const z = BOUND.z0 + rnd() * (BOUND.z1 - BOUND.z0);
      if (valid(x, z)) return { x, z };
    }
    return { x: 110, z: 60 };
  }

  // ---------- 几何（预先平移到“关节”或最终位置）----------
  const geoLeg = new THREE.CylinderGeometry(0.062, 0.055, 0.78, 7); geoLeg.translate(0, -0.39, 0);
  const geoArm = new THREE.CylinderGeometry(0.055, 0.048, 0.60, 7); geoArm.translate(0, -0.30, 0);
  const geoBody = new THREE.CylinderGeometry(0.17, 0.21, 0.64, 9); geoBody.translate(0, 1.10, 0);
  const geoHead = new THREE.SphereGeometry(0.165, 10, 8); geoHead.translate(0, 1.60, 0);
  const geoHatTop = new THREE.CylinderGeometry(0.135, 0.135, 0.30, 10); geoHatTop.translate(0, 1.86, 0);
  const geoHatBrim = new THREE.CylinderGeometry(0.245, 0.245, 0.035, 12); geoHatBrim.translate(0, 1.73, 0);

  const matBody = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const matLimb = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const matSkin = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const matHat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  const inst = {
    body: new THREE.InstancedMesh(geoBody, matBody, N),
    head: new THREE.InstancedMesh(geoHead, matSkin, N),
    arm: new THREE.InstancedMesh(geoArm, matLimb, N * 2),
    leg: new THREE.InstancedMesh(geoLeg, matLimb, N * 2),
    hatTop: new THREE.InstancedMesh(geoHatTop, matHat, N),
    hatBrim: new THREE.InstancedMesh(geoHatBrim, matHat, N),
  };
  const group = new THREE.Group();
  group.name = 'crowd';
  for (const k of Object.keys(inst)) {
    inst[k].frustumCulled = false;
    inst[k].instanceMatrix.setUsage?.(THREE.DynamicDrawUsage);
    group.add(inst[k]);
  }
  scene.add(group);

  // ---------- 人物状态 ----------
  const people = [];
  for (let i = 0; i < N; i++) {
    const shirt = pick(SHIRT);
    const hasHat = rnd() < 0.30;
    people.push({
      x: 0, z: 0, hdg: rnd() * 6.28, speed: 0.55 + rnd() * 1.35,
      phase: rnd() * 6.28, hat: hasHat ? 1 : 0,
      colorBody: new THREE.Color(shirt),
      colorLimb: new THREE.Color(rnd() < 0.5 ? shirt : pick(PANTS)),
      colorSkin: new THREE.Color(pick(SKIN)),
      colorHat: new THREE.Color(pick(HAT)),
      // 组成员信息
      slot: 0, groupId: -1, leader: -1,
    });
  }

  // ---------- 编组：独行 / 结伴 / 驻足交谈 ----------
  const groups = [];
  {
    let i = 0;
    while (i < N) {
      const r = rnd();
      let size = r < 0.5 ? 1 : r < 0.78 ? 2 : r < 0.93 ? 3 : 4;
      size = Math.min(size, N - i);
      const talk = rnd() < 0.26;                       // 约 1/4 的组是驻足交谈
      const g = { id: groups.length, size, talk, members: [], tx: 0, tz: 0, speed: 0.6 + rnd() * 1.2, wait: 0 };
      const p0 = randomPoint();
      g.tx = p0.x; g.tz = p0.z;
      for (let k = 0; k < size; k++) {
        const idx = i + k;
        people[idx].groupId = g.id;
        people[idx].slot = k;
        people[idx].leader = i;
        g.members.push(idx);
        const sp = randomPoint();
        people[idx].x = sp.x; people[idx].z = sp.z;
        if (talk) people[idx].speed = 0;
      }
      if (talk) {                                      // 交谈：围成一圈面向中心
        const c = randomPoint();
        g.cx = c.x; g.cz = c.z;
        g.members.forEach((idx, k) => {
          const a = (k / size) * Math.PI * 2 + rnd() * 0.4;
          const rr = 0.75 + rnd() * 0.5;
          people[idx].x = c.x + Math.cos(a) * rr;
          people[idx].z = c.z + Math.sin(a) * rr;
          people[idx].hdg = Math.atan2(c.x - people[idx].x, c.z - people[idx].z);
        });
      }
      groups.push(g);
      i += size;
    }
  }

  // ---------- 每帧 ----------
  const mPerson = new THREE.Matrix4();
  const mT = new THREE.Matrix4(), mR = new THREE.Matrix4(), mL = new THREE.Matrix4(), mOut = new THREE.Matrix4();
  const vPos = new THREE.Vector3(), vZero = new THREE.Vector3(0, 0, 0), vOne = new THREE.Vector3(1, 1, 1);
  const q = new THREE.Quaternion(), axisY = new THREE.Vector3(0, 1, 0);

  // 组内站位偏移（本地坐标：+z 为前方）
  const SLOT = [[0, 0], [-0.95, -0.9], [0.95, -0.9], [0, -1.85], [0, -0.35]];

  // ============================================================
  // 彩蛋：小树林约会的小情侣（不写进任何文档）
  // ============================================================
  const coupleGroup = new THREE.Group();
  coupleGroup.name = 'couple';
  scene.add(coupleGroup);

  // 单人小模型：与人群同比例（约 1.75m）；返回可动画的部件引用
  function buildPerson(cfg) {
    const M = {
      cloth: new THREE.MeshLambertMaterial({ color: cfg.cloth }),
      cloth2: new THREE.MeshLambertMaterial({ color: cfg.cloth2 }),
      skin: new THREE.MeshLambertMaterial({ color: cfg.skin }),
      hair: new THREE.MeshLambertMaterial({ color: cfg.hair }),
      dark: new THREE.MeshLambertMaterial({ color: 0x2b2f36 }),
    };
    const g = new THREE.Group();

    // 腿（髋为轴）
    const legs = [];
    for (const sx of [-0.10, 0.10]) {
      const lg = new THREE.Group(); lg.position.set(sx, 0.78, 0);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.058, 0.80, 7), cfg.skirt ? M.skin : M.cloth2);
      m.position.y = -0.40; lg.add(m);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.22), M.dark);
      shoe.position.set(0, -0.775, 0.04); lg.add(shoe);
      g.add(lg); legs.push(lg);
    }
    // 躯干（女：连衣裙；男：衬衫）
    const torso = new THREE.Mesh(
      cfg.skirt ? new THREE.CylinderGeometry(0.165, 0.36, 0.72, 14) : new THREE.CylinderGeometry(0.19, 0.22, 0.66, 10),
      M.cloth
    );
    torso.position.y = cfg.skirt ? 1.06 : 1.10; g.add(torso);
    if (cfg.skirt) {                                  // 浅色上衣
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.205, 0.34, 10), M.cloth2);
      top.position.y = 1.30; g.add(top);
    }
    // 手臂（肩为轴）
    const arms = [];
    for (const sx of [-0.225, 0.225]) {
      const ag = new THREE.Group(); ag.position.set(sx, 1.36, 0);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.60, 7), cfg.skirt ? M.cloth2 : M.cloth);
      m.position.y = -0.30; ag.add(m);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), M.skin);
      hand.position.y = -0.60; ag.add(hand);
      g.add(ag); arms.push(ag);
    }
    // 头（颈为轴）+ 头发 + 鼻尖（用来指示朝向）
    const headG = new THREE.Group(); headG.position.y = 1.42;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 12, 10), M.skin);
    head.position.y = 0.18; headG.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.172, 12, 10), M.hair);
    hair.position.set(0, 0.205, -0.012); hair.scale.set(1, 0.92, 1); headG.add(hair);
    if (cfg.longHair) {
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.11), M.hair);
      back.position.set(0, 0.02, -0.13); headG.add(back);
    }
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.06), M.skin);
    nose.position.set(0, 0.155, 0.165); headG.add(nose);
    g.add(headG);

    g.scale.setScalar(cfg.scale);
    return { group: g, legs, arms, headG };
  }

  const couple = [
    buildPerson({ cloth: '#2E6EA6', cloth2: '#3A4149', skin: '#E4BE96', hair: '#2E2822', scale: 1.03, skirt: false, longHair: false }),
    buildPerson({ cloth: '#B4614E', cloth2: '#F3E9D2', skin: '#F0D3B4', hair: '#3A2A22', scale: 0.94, skirt: true, longHair: true }),
  ];
  couple.forEach((c) => coupleGroup.add(c.group));

  // 站位：面对面，间距 0.83m
  const hdgOf = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const hdgM = hdgOf(DATE.male, DATE.female), hdgF = hdgOf(DATE.female, DATE.male);
  couple[0].group.position.set(DATE.male.x, DATE.y, DATE.male.z); couple[0].group.rotation.y = hdgM;
  couple[1].group.position.set(DATE.female.x, DATE.y, DATE.female.z); couple[1].group.rotation.y = hdgF;

  // 头顶小爱心（CSS2D，慢慢上浮渐隐）
  {
    const st = document.createElement('style');
    st.textContent = `
      .couple-heart{font-size:15px;line-height:1;color:#E2547A;opacity:0;
        text-shadow:0 0 6px rgba(226,84,122,.5);pointer-events:none;user-select:none;}
      body.night .couple-heart{color:#FF6E93;text-shadow:0 0 10px rgba(255,110,147,.6);}`;
    document.head.appendChild(st);
  }
  const HEART_LIFE = 2.4;
  let heartSeed = 7777;
  const hrnd = () => (heartSeed = (heartSeed * 16807) % 2147483647) / 2147483647;
  const hearts = [];
  for (let i = 0; i < 3; i++) {
    const el = document.createElement('div');
    el.className = 'couple-heart';
    el.textContent = '❤';
    const obj = new CSS2DObject(el);
    obj.visible = false;
    scene.add(obj);
    hearts.push({ obj, el, t: -1, wait: 0.8 + i * 1.5, who: i % 2, x0: 0, z0: 0 });
  }

  function setPerson(i, x, z, y, hdg, active, legSwing, armSwing) {
    if (!active) {
      q.setFromAxisAngle(axisY, 0);
      mPerson.compose(vPos.set(x, y, z), q, vZero);
    } else {
      q.setFromAxisAngle(axisY, hdg);
      mPerson.compose(vPos.set(x, y, z), q, vOne);
    }
    const p = people[i];
    inst.body.setMatrixAt(i, mPerson);
    inst.head.setMatrixAt(i, mPerson);
    if (p.hat) { inst.hatTop.setMatrixAt(i, mPerson); inst.hatBrim.setMatrixAt(i, mPerson); }
    else { mOut.makeScale(0, 0, 0); inst.hatTop.setMatrixAt(i, mOut); inst.hatBrim.setMatrixAt(i, mOut); }
    // 四肢：本地 偏移 → 绕 x 摆动
    const limbs = [[-0.095, 0.78, legSwing, 2 * i], [0.095, 0.78, -legSwing, 2 * i + 1]];
    for (const [lx, ly, ang, li] of limbs) {
      mT.makeTranslation(lx, ly, 0);
      mR.makeRotationX(ang);
      mL.multiplyMatrices(mT, mR);
      mOut.multiplyMatrices(mPerson, mL);
      inst.leg.setMatrixAt(li, mOut);
    }
    const arms = [[-0.215, 1.36, -armSwing, 2 * i], [0.215, 1.36, armSwing, 2 * i + 1]];
    for (const [lx, ly, ang, li] of arms) {
      mT.makeTranslation(lx, ly, 0);
      mR.makeRotationX(ang);
      mL.multiplyMatrices(mT, mR);
      mOut.multiplyMatrices(mPerson, mL);
      inst.arm.setMatrixAt(li, mOut);
    }
  }

  let started = false;
  function update(dt) {
    const groundOn = built.ground && built.ground.visible;
    const guiding = ctx.guide && ctx.guide.isOn && ctx.guide.isOn();
    const show = groundOn && !guiding && !(ctx.egg && ctx.egg.isPlaying && ctx.egg.isPlaying());

    if (!started) {                                    // 首帧写入配色
      people.forEach((p, i) => {
        inst.body.setColorAt(i, p.colorBody);
        inst.head.setColorAt(i, p.colorSkin);
        inst.arm.setColorAt(2 * i, p.colorLimb); inst.arm.setColorAt(2 * i + 1, p.colorLimb);
        inst.leg.setColorAt(2 * i, p.colorLimb); inst.leg.setColorAt(2 * i + 1, p.colorLimb);
        inst.hatTop.setColorAt(i, p.colorHat); inst.hatBrim.setColorAt(i, p.colorHat);
      });
      started = true;
    }

    const night = state.theme === 'night';
    const active = Math.max(4, Math.round(N * (night ? NIGHT_RATIO : DAY_RATIO)));

    // 组行为
    for (const g of groups) {
      const lead = g.members[0];
      if (!g.talk) {
        const lp = people[lead];
        const dx = g.tx - lp.x, dz = g.tz - lp.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.8) {
          if (g.wait > 0) g.wait -= dt * 0.35;
          else { const t = randomPoint(); g.tx = t.x; g.tz = t.z; g.wait = rnd() * 2.5; }
        } else {
          const nx = dx / d, nz = dz / d;
          const sp = g.speed;
          lp.x += nx * sp * dt; lp.z += nz * sp * dt;
          lp.hdg = Math.atan2(nx, nz);
          lp.phase += sp * 2.4 * dt;
        }
      }
    }

    for (let i = 0; i < N; i++) {
      const p = people[i];
      const on = show && i < active;
      if (!on) { setPerson(i, 0, -500, 0, 0, false, 0, 0); continue; }

      const g = groups[p.groupId];
      if (g.talk) {
        // 驻足交谈：轻微摇摆 + 手臂小幅摆动，偶尔换脚
        const t2 = performance.now() * 0.001;
        const id = i * 1.7;
        const sway = Math.sin(t2 * 0.9 + id) * 0.06;
        const bob = Math.abs(Math.sin(t2 * 1.1 + id)) * 0.012;
        setPerson(i, p.x + sway * 0.2, p.z, bob, p.hdg + sway, true, sway * 1.2, Math.sin(t2 * 1.3 + id) * 0.10);
      } else if (p.slot > 0) {
        // 跟随者：站在队首后侧
        const lp = people[p.leader];
        const [ox, oz] = SLOT[Math.min(p.slot, SLOT.length - 1)];
        const c = Math.cos(lp.hdg), s = Math.sin(lp.hdg);
        p.x = lp.x + ox * c + oz * s;
        p.z = lp.z - ox * s + oz * c;
        p.hdg = lp.hdg;
        p.phase = lp.phase + p.slot * 0.7;
        setPerson(i, p.x, p.z, 0, p.hdg, true, Math.sin(p.phase) * 0.5, -Math.sin(p.phase) * 0.42);
      } else {
        setPerson(i, p.x, p.z, 0, p.hdg, true, Math.sin(p.phase) * 0.5, -Math.sin(p.phase) * 0.42);
      }
    }

    // ---------- 彩蛋：小树林约会（凑得很近交谈 + 头顶冒小爱心） ----------
    coupleGroup.visible = show;
    if (show) {
      const t2 = performance.now() * 0.001;
      couple.forEach((c, ci) => {
        const ph = ci * 1.9;
        c.group.rotation.y = (ci === 0 ? hdgM : hdgF) + Math.sin(t2 * 0.6 + ph) * 0.055;
        c.group.position.y = DATE.y + Math.abs(Math.sin(t2 * 1.6 + ph)) * 0.013;
        c.headG.rotation.x = Math.sin(t2 * 2.3 + ph) * 0.07;
        c.headG.rotation.y = Math.sin(t2 * 1.1 + ph) * 0.11;
        c.arms[0].rotation.x = -0.10 + Math.sin(t2 * 1.9 + ph) * 0.13;          // 说话手势
        c.arms[1].rotation.x = -0.06 + Math.sin(t2 * 1.9 + 1.4 + ph) * 0.16;
        c.legs[0].rotation.x *= 0.9; c.legs[1].rotation.x *= 0.9;
      });
    }
    for (const h of hearts) {
      if (!show) { h.obj.visible = false; h.t = -1; h.wait = 0.7; continue; }
      if (h.t < 0) {
        h.wait -= dt;
        if (h.wait <= 0) {
          h.t = 0; h.who = (h.who + 1) % 2;
          const p = h.who === 0 ? DATE.male : DATE.female;
          h.x0 = p.x + (hrnd() - 0.5) * 0.55;
          h.z0 = p.z + (hrnd() - 0.5) * 0.55;
          h.obj.visible = true;
        } else h.obj.visible = false;
        continue;
      }
      h.t += dt;
      const k = h.t / HEART_LIFE;
      if (k >= 1) { h.t = -1; h.wait = 1.0 + hrnd() * 2.0; h.obj.visible = false; continue; }
      h.obj.position.set(h.x0 + Math.sin(k * 5.2) * 0.16, 2.32 + k * 1.5, h.z0);
      h.el.style.opacity = (k < 0.2 ? (k / 0.2) * 0.95 : 0.95 * (1 - (k - 0.2) / 0.8)).toFixed(3);
    }

    for (const k of Object.keys(inst)) inst[k].instanceMatrix.needsUpdate = true;
    group.visible = true;                              // 由实例矩阵控制显隐
  }

  return { update, count: N };
}
