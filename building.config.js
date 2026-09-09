// ============================================================
// 新水木馆 · 插接书院 v2.5 — 唯一数据源
// 所有尺寸只在这里写一次；改数字 → 刷新页面 → 整栋楼自动重建
// 单位：米（m）。坐标系：x 东向，y 上，z 南向；塔身西南角为局部原点
// ============================================================

export const CONFIG = {
  // ---- 总体 ----
  project: { name: '新水木馆', subtitle: '插接书院 · v2.5', people: 512 },

  // ---- 塔身（矩形板楼）----
  tower: {
    length: 90,        // 东西
    width: 21,         // 南北
    floorHeight: 3.6,  // 居住层层高
    floors: 16,        // 3F–18F
    firstFloor: 3,
    capsuleHeight: 3.0, // 舱体净高（层高 3.6 − 0.6 结构管线）
  },

  // ---- 横向三带（北→南）----
  bands: {
    corridor: 2.4,   // 外廊（玻璃幕墙，全楼唯一人行通道）
    capsule: 4.0,    // 舱体带
    core: 8.2,       // 中央带 = 1.6 管线 + 5.0 通长槽 + 1.6 管线
    slot: 5.0,       // 通长槽（横梁移动区，仅舱体区）
    pipe: 1.6,       // 管线结构带（不上人）
  },

  // ---- 纵向五段（西→东）----
  segments: [
    { id: 'westService', length: 21 },  // 西端综合服务区（湿区+核心+大空间区）
    { id: 'westMast',    length: 5  },  // 西立柱区
    { id: 'capsules',    length: 47 },  // 舱体区
    { id: 'eastMast',    length: 5  },  // 东立柱区
    { id: 'eastService', length: 12 },  // 东端交通与客厅区
  ],

  // ---- 标高（底标高由代码累加，这里写层高）----
  levels: [
    { id: 'B2', height: 6.5, group: 'basement', label: '地下二层·运动场馆' },
    { id: 'B1', height: 4.5, group: 'basement', label: '地下一层·舱体储运' },
    { id: 'F1', height: 5.1, group: 'podium',   label: '一层·迎客' },
    { id: 'F2', height: 4.5, group: 'podium',   label: '二层·科创与治理' },
    // F3–F18 由代码生成：height 3.6, group 'residential'
  ],
  // 已核算标高：B2底 −11.0 / B1底 −4.5 / 1F底 0 / 2F底 5.1 / 3F底 9.6 / 18F顶 67.2

  // ---- 舱体 ----
  capsule: {
    w: 3.0,   // 面宽（沿 x）
    d: 4.0,   // 进深（沿 z）
    h: 3.0,   // 净高
    perRow: 17,        // 每排 17 位
    livingPerFloor: 32,
    funcSlotPerFloor: 1, // 6×4 功能舱空位（占 2 位）
    funcSlotW: 6.0,
    // 最西 2 位与西立柱区并置（横梁西端短悬臂覆盖）
    westOverlap: 2,
    // 功能空位：奇数层北排/偶数层南排；每层错位 1 格
    funcSlotStartPos: 7, // 标准层图示位于第 7–8 位
  },

  // ---- 龙门吊机械系统 ----
  mechanics: {
    mastX: [21, 73],     // 两立柱区西缘（塔身局部坐标）
    mastW: 5,
    mastD: 8.2,
    beamSpan: 57,        // 覆盖 x=21–78
    beamMinFloor: 3,     // 最低作业面 3F
    slotWidth: 5,
  },

  // ---- 基座与地下 ----
  podium: { length: 108, width: 25.2 }, // 与塔身同比例 30:7 放大 1.2 倍，塔身居中

  // ---- 大空间区（西端，约 210㎡）----
  bigSpace: { w: 13.0, d: 16.2 },

  // ---- 集中大空间出厂落位（学期级投票对象=健身/小图书馆/大排练）----
  programs: {
    F4: '小图书馆', F5: '健身区', F7: '大排练室', F8: '小图书馆',
    F9: '书院大客厅', F10: '书院大客厅',  // 固定，两层通高
    F11: '健身区', F13: '小图书馆', F15: '大排练室', F16: '健身区',
    // 其余 6 层（F3/F6/F12/F14/F17/F18）= 标准层开放自习区
  },
  programFixed: ['F9', 'F10'], // 大客厅锁定不参与投票

  // ---- 大空间功能配色（全部取自统一色板）----
  programColors: {
    '书院大客厅': '#F3E9D2', // hallGold
    '小图书馆':   '#DCE8DC', // studyGreen
    '健身区':     '#D5E5D0', // yardGreen
    '大排练室':   '#E5D4C0', // galleryTan
    '开放自习区': '#E9E4D8', // 标准层
  },
  programEN: {
    '书院大客厅': 'Grand Hall', '小图书馆': 'Mini Library', '健身区': 'Gym',
    '大排练室': 'Rehearsal Hall', '开放自习区': 'Open Study',
  },

  // ---- 功能舱舱型库（14 型，小程序+热点用）----
  capsuleTypes: [
    '琴房', '小排练室', '桌游', '游戏', '会客', '画室', '厨房',
    '展览', '冥想', '储藏', '党建', '社团', '下午茶', '图书漂流',
  ],

  // ---- 统一色板（与全部图纸/展板一致，勿另起色）----
  colors: {
    paper:      '#FAF7F2', // 米白底
    brandGreen: '#1F5C4D', // 主绿（功能空位/标题强调）
    accentRust: '#A6462E', // 点缀橙红（塔身投影/机械/流线）
    homeBlue:   '#2E6EA6', // 归家流线蓝
    logisOrange:'#C86A2E', // 后勤橙
    lobbyGold:  '#C9A227', // 门厅金
    wood: ['#D9B48A', '#E4CFA8', '#C8956C', '#B98A5A', '#A0785A', '#8F6B4A'], // 舱体木色组
    hallGold:   '#F3E9D2', // 大空间区金底
    galleryTan: '#E5D4C0', // 展厅米棕
    studyGreen: '#DCE8DC', // 学习区绿
    reportBlue: '#C7D3E8', // 报告厅蓝灰
    waterBlue:  '#9CC4E4', // 水
    yardGreen:  '#D5E5D0', // 庭院绿
    structGray: ['#D8D2C4', '#CFC8BA'], // 墙体/结构灰
    ink:        '#3A352E', // 细线墨色
    night:      '#0E1116', // 夜航底
    nightEdge:  '#7FD4C1', // 夜航青描边
  },

  // ---- i18n（中英一键切换，文案全部集中在此）----
  STRINGS: {
    title:        { zh: '新水木馆 · 插接书院', en: 'New Shuimu Hall · Plug-in College' },
    version:      { zh: '方案 v2.5 · 3D 交互展示', en: 'Scheme v2.5 · Interactive 3D' },
    slogan:       { zh: '楼是书院的，舱体是自己的', en: 'The building belongs to the college, capsules to their owners' },
    subSlogan:    { zh: '一条横梁，调度整座书院的生活', en: 'One gantry beam orchestrates the life of the whole college' },
    hint:         { zh: '拖动旋转 · 滚轮缩放 · 右键平移', en: 'Drag to orbit · Scroll to zoom · Right-drag to pan' },
    tower:        { zh: '塔身 90×21m · 16 居住层 · 512 舱', en: 'Tower 90×21m · 16 floors · 512 capsules' },
    panel:        { zh: '控制面板', en: 'Controls' },
    floors:       { zh: '楼层显隐', en: 'Floors' },
    floorsAll:    { zh: '全部', en: 'All' },
    floorsAbove:  { zh: '仅地上', en: 'Above ground' },
    floorsNone:   { zh: '全隐', en: 'None' },
    glass:        { zh: '幕墙透明度', en: 'Curtain glass' },
    labels:       { zh: '楼层标注', en: 'Floor labels' },
    theme:        { zh: '主题', en: 'Theme' },
    themeLight:   { zh: '图纸', en: 'Blueprint' },
    themeNight:   { zh: '夜航', en: 'Night' },
    langBtn:      { zh: 'EN', en: '中' },
    shot:         { zh: '导出截图（高清 PNG）', en: 'Export PNG (hi-res)' },
    legend:       { zh: '大空间功能', en: 'Program legend' },
    beamNote:     { zh: '龙门吊横梁（闲时停屋顶）', en: 'Gantry beam (parked on roof)' },
    slotEmpty:    { zh: '功能舱空位', en: 'Function slot' },
    secDemo:      { zh: '演示', en: 'Demo' },
    presetAerial: { zh: '全貌鸟瞰', en: 'Aerial' },
    presetSouth:  { zh: '南立面', en: 'South facade' },
    presetSection:{ zh: '剖透视·横梁吊舱', en: 'Section · gantry' },
    presetFloor:  { zh: '标准层特写', en: 'Typical floor' },
    presetPodium: { zh: '基座屋顶庭院', en: 'Podium roof' },
    beamPlay:     { zh: '▶ 横梁吊舱演示', en: '▶ Gantry demo' },
    beamStop:     { zh: '■ 停止并复位', en: '■ Stop & reset' },
    secClip:      { zh: '剖切', en: 'Section' },
    clipZ:        { zh: '纵剖（沿通长槽）', en: 'Longitudinal (slot)' },
    clipX:        { zh: '横剖', en: 'Cross section' },
    guideMode:    { zh: '楼层导引（3D 分层）', en: 'Floor Guide (3D stack)' },
    guideExit:    { zh: '退出楼层导引', en: 'Exit Floor Guide' },
    // P2 · 全流程 / 生长 / 数据面板
    summonPlay:  { zh: '▶ 日级召唤全流程', en: '▶ Daily summon flow' },
    summonStop:  { zh: '■ 停止召唤', en: '■ Stop' },
    growthPlay:  { zh: '▶ 立面生长动画', en: '▶ Facade growth' },
    growthStop:  { zh: '■ 停止生长', en: '■ Stop' },
    subB1:   { zh: '① B1 储存区出库', en: '① B1 storage out' },
    subLift: { zh: '② 立柱井垂直平台 · B1→3F', en: '② Vertical platform B1→3F' },
    subBeam: { zh: '③ 横梁交接 · 吊升至 8F', en: '③ Beam handover · up to 8F' },
    subArm:  { zh: '④ 机械臂对位', en: '④ Arm targeting' },
    subIn:   { zh: '⑤ 推送入位 · 锁接水电', en: '⑤ Push in & lock' },
    subDone: { zh: '⑥ 舱体就位 —— 空间是被召唤的', en: '⑥ In place — space, summoned' },
    growthCap: { zh: '已插入舱体', en: 'capsules in' },
    dataBtn: { zh: '数据面板', en: 'Data Panel' },
    dataTitle: { zh: '数据一览', en: 'Data at a glance' },
    dPeople: { zh: '居住人数', en: 'Residents' },
    dFloors: { zh: '居住楼层', en: 'Floors' },
    dSlots: { zh: '每层舱位', en: 'Slots/floor' },
    dQuota: { zh: '大空间配额 · 共 10 层', en: 'Program quota · 10 floors' },
    dHeat: { zh: '预约热力 · 16 层 × 6 时段', en: 'Bookings · 16F × 6' },
    dTop: { zh: '热门舱型', en: 'Top types' },
    dTopList: { zh: '🎹 琴房 · 🍳 厨房 · 🎮 游戏舱', en: '🎹 Piano · 🍳 Kitchen · 🎮 Gaming' },
    dNote: { zh: '数据驱动下学期投票与库存调整', en: 'Data drives next vote & inventory' },
  },
};

// ---- 标高计算（代码累加，不手写）----
export function computeElevations() {
  const list = [];
  let y = -11.0; // B2 底
  for (const lv of CONFIG.levels) {
    list.push({ ...lv, base: y, top: y + lv.height });
    y += lv.height;
  }
  for (let f = CONFIG.tower.firstFloor; f < CONFIG.tower.firstFloor + CONFIG.tower.floors; f++) {
    list.push({ id: 'F' + f, height: CONFIG.tower.floorHeight, group: 'residential', base: y, top: y + CONFIG.tower.floorHeight, label: f + 'F' });
    y += CONFIG.tower.floorHeight;
  }
  return list; // 末层顶 = 67.2
}

// ============================================================
// APP · 模拟小程序数据（v1.0，2026-09-09）
// 与 3D 网页共享同一 CONFIG（尺寸/色板/舱型/出厂楼层）
// ============================================================
export const APP = {
  // ---- 用户（演示固定值）----
  me: {
    id: 'F07-N12',      // 7F 北排第 12 位
    floor: 7, row: 'N', pos: 12,
    name: '同学 2025****', points: 100,
    usedThisMonth: 1,   // 已用召唤次数（第 2、3 次免费）
  },

  // ---- 日级预约时段（每空位每天 3 场）----
  sessions: ['14:00', '19:00', '21:00'],
  days: ['今天', '明天'],
  daysEN: ['Today', 'Tomorrow'],

  // ---- 积分规则 ----
  points: {
    monthly: 100,          // 每人每月
    freeCount: 3,          // 前 3 次免费
    costAfter: 10,         // 第 4 次起 10 分/次
    primeSurcharge: 5,     // 热门时段（19:00）+5 分
    primeSession: '19:00',
  },

  // ---- 种子化伪随机（固定种子，答辩结果一致）----
  seed: 20260911, // 答辩日

  // ---- 功能舱舱型库（含图示 emoji + 简介）----
  capsuleTypes: [
    { name: '琴房',      en: 'Piano Room',    icon: '🎹' },
    { name: '小排练室',  en: 'Rehearsal',     icon: '🎤' },
    { name: '桌游',      en: 'Board Games',   icon: '🎲' },
    { name: '游戏',      en: 'Gaming',        icon: '🎮' },
    { name: '会客',      en: 'Meeting',       icon: '🛋️' },
    { name: '画室',      en: 'Painting',      icon: '🎨' },
    { name: '厨房',      en: 'Kitchen',       icon: '🍳' },
    { name: '展览',      en: 'Exhibition',    icon: '🖼️' },
    { name: '冥想',      en: 'Meditation',    icon: '🧘' },
    { name: '储藏',      en: 'Storage',       icon: '📦' },
    { name: '党建',      en: 'Party Room',    icon: '旗' },
    { name: '社团',      en: 'Club Room',     icon: '🎪' },
    { name: '下午茶',    en: 'Tea Time',      icon: '🍵' },
    { name: '图书漂流',  en: 'Book Crossing', icon: '📚' },
  ],

  // ---- 月级换舱：换舱大厅规则（v1.1，2026-09-09 交互改版）----
  exchange: {
    publishCost: 5,     // 发布一条换舱需求消耗
    agreeReward: 8,     // 同意他人需求（促成交换）奖励
    matchTimeout: 5,    // 发布后无人应答，N 秒后系统自动匹配（演示快进）
  },

  // ---- 小程序 UI 文案（中英）----
  S: {
    tabHome:    { zh: '我的舱位', en: 'My Capsule' },
    tabVote:    { zh: '学期投票', en: 'Vote' },
    tabSummon:  { zh: '召唤功能舱', en: 'Summon' },
    tabData:    { zh: '数据看板', en: 'Insights' },
    slogan:     { zh: '空间不是被分配的，而是被召唤的。', en: 'Space is not allocated, but summoned.' },
    back:       { zh: '返回', en: 'Back' },
    confirm:    { zh: '确认', en: 'Confirm' },
    cancel:     { zh: '取消', en: 'Cancel' },
    close:      { zh: '关闭', en: 'Close' },
    // 页1 我的舱位 + 换舱大厅
    myCap:      { zh: '我的舱位', en: 'My Capsule' },
    capId:      { zh: '舱位号', en: 'Capsule' },
    facing:     { zh: '朝向', en: 'Facing' },
    facingN:    { zh: '北 · 看中庭', en: 'North' },
    facingS:    { zh: '南 · 阳面', en: 'South · Sunny' },
    neighbors:  { zh: '邻居', en: 'Neighbors' },
    hallBtn:    { zh: '进入换舱大厅', en: 'Exchange Hall' },
    hallTitle:  { zh: '换舱大厅', en: 'Exchange Hall' },
    hallSub:    { zh: '月级换舱 · 双向市场，系统兜底', en: 'Monthly exchange · two-sided market' },
    hallMine:   { zh: '我的换舱需求', en: 'My request' },
    hallPublish:{ zh: '发布换舱需求', en: 'Publish Request' },
    hallFloor:  { zh: '意向楼层范围', en: 'Floor range' },
    hallPos:    { zh: '意向舱位号范围', en: 'Capsule no. range' },
    hallWantSunny: { zh: '只看阳面（南排）', en: 'Sunny side only' },
    hallFee:    { zh: '本次发布将消耗', en: 'This publish costs' },
    hallOffers: { zh: '大家的换舱需求', en: 'Open requests' },
    hallAgree:  { zh: '同意交换', en: 'Agree to swap' },
    hallAgreed: { zh: '已同意 · 交换成功', en: 'Swapped!' },
    hallReward: { zh: '系统奖励换舱积分', en: 'Points rewarded' },
    hallNoReply:{ zh: '暂无人应答，系统自动匹配中…', en: 'No taker yet, auto-matching…' },
    hallMatched:{ zh: '系统匹配成功', en: 'Auto-matched' },
    hallMatchDesc: { zh: '已协调到与你需求最相近的舱位', en: 'Placed at closest match to your request' },
    floorTo:    { zh: '至', en: 'to' },
    hallFrom:   { zh: 'F07-N12 · 北排', en: 'F07-N12 · North' },
    ptCost:     { zh: '分', en: 'pts' },
    // 页2 学期投票
    voteTitle:  { zh: '学期投票', en: 'Semester Vote' },
    voteSub:    { zh: '下学期 · 大空间功能落位', en: 'Next semester · program placement' },
    quotaGym:   { zh: '健身区', en: 'Gym' },
    quotaLib:   { zh: '小图书馆', en: 'Mini Library' },
    quotaReh:   { zh: '大排练室', en: 'Rehearsal' },
    quotaHint:  { zh: '需恰好 健身3层 · 图书馆3层 · 排练2层', en: 'Need exactly Gym×3 · Lib×3 · Reh×2' },
    fixedHall:  { zh: '大客厅固定', en: 'Hall fixed' },
    heatHint:   { zh: '投票依据：上学期预约热力数据', en: 'Based on last semester booking data' },
    tower:      { zh: '楼体示意', en: 'Tower schematic' },
    voteSubmit: { zh: '提交投票', en: 'Submit Vote' },
    voteOk:     { zh: '投票成功', en: 'Vote submitted' },
    liveVotes:  { zh: '全院实时票况', en: 'Live results' },
    votesUnit:  { zh: '票', en: 'votes' },
    yourBallot: { zh: '你的投票', en: 'Your ballot' },
    resultBtn:  { zh: '查看下学期落位结果', en: 'View results' },
    // 页3 召唤功能舱
    summonTitle: { zh: '召唤功能舱', en: 'Summon Capsule' },
    pickType:   { zh: '① 选择舱型', en: '① Pick capsule type' },
    pickSlot:   { zh: '② 选择日期与时段', en: '② Pick date & time' },
    pick3:      { zh: '③ 确认召唤', en: '③ Confirm' },
    perDay:     { zh: '每空位每天 3 场', en: '3 sessions per slot daily' },
    yourPoints: { zh: '空间积分', en: 'Space points' },
    freeLeft:   { zh: '本月免费次数', en: 'Free uses left' },
    costEst:    { zh: '本次预计扣', en: 'Cost' },
    freeTag:    { zh: '免费', en: 'Free' },
    summonBtn:  { zh: '召唤', en: 'Summon' },
    conflict:   { zh: '本层该时段已被预约', en: 'Slot taken on this floor' },
    adjusted:   { zh: '已为你调配到相邻层', en: 'Reassigned to adjacent floor' },
    notEnough:  { zh: '空间积分不足', en: 'Insufficient points' },
    ruleCard:   { zh: '积分规则：每人每月 100 分；前 3 次免费；第 4 次起 10 分/次；19:00 热门时段 +5 分。积分防止囤积，让稀缺空位流转起来。', en: '100 pts/month; first 3 free; 10 pts from the 4th; +5 for prime time. Points keep slots circulating.' },
    dispatching: { zh: '龙门吊调舱中…', en: 'Gantry dispatching…' },
    stepB1:     { zh: 'B1 储存区出库', en: 'Out of B1 storage' },
    stepLift:   { zh: '立柱井垂直平台', en: 'Vertical platform' },
    stepBeam:   { zh: '横梁吊运', en: 'Beam transport' },
    stepIn:     { zh: '推送入位 · 锁接水电', en: 'Lock in · plug water/power' },
    ready:      { zh: '舱体已就位', en: 'Capsule ready' },
    scan:      { zh: '扫码开门', en: 'Scan to open' },
    // 页4 数据看板
    dataTitle:  { zh: '数据看板', en: 'Insights' },
    heatMap:    { zh: '预约热力图', en: 'Booking heatmap' },
    heatMapSub: { zh: '16 层 × 6 时段（上学期）', en: '16 floors × 6 sessions' },
    topTypes:   { zh: '热门舱型排行', en: 'Top capsule types' },
    mergeCount: { zh: '本月拼舱申请', en: 'Monthly merge requests' },
    dataNote:   { zh: '数据驱动下学期投票与库存调整', en: 'Data drives next vote & inventory' },
    slots:      { zh: '空位', en: 'slots' },
    peakHint:   { zh: '健身晚间高 · 图书馆午后高 · 排练周末高', en: 'Gym peaks at night · Library afternoons · Rehearsal weekends' },
  },
};
