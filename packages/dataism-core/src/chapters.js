// ─────────────────────────────────────────────────────────────
// 《时辰》十二时辰章节注册表 —— Dataism 展品的内容层
//
// 中国传统把一昼夜分为十二时辰，每辰两小时：子丑寅卯辰巳午未申酉戌亥。
// 本作品让粒子云在每个时辰呈现不同的配色、行为与声音——
// 画面亮度随真实昼夜呼吸，作品本身即是一座时钟。
//
// 每个 chapter：
//   branch     地支（子…亥）
//   branchEn   拼音
//   name       时辰名（夜半/鸡鸣/平旦/日出/食时/隅中/日中/日昳/哺时/日入/黄昏/人定）
//   en         英文名
//   hours      [起, 止) 24h 制
//   poem       一句意象（切换章节时展示）
//   dataNote   数据叙事：这个时辰的现实世界数据在做什么（深层价值文本）
//   palette    { inner, outer, core } 粒子配色（内圈/外圈/中央高光）
//   behavior   { flow, noiseAmp, sizeScale, mouseStrength } 粒子行为
//   soundscape 对应的音景 preset id（drift/bloom/pulse/storm/tide/drone）
//   energy     标称活跃度 0~1（昼夜呼吸弧线：夜低昼高）
// ─────────────────────────────────────────────────────────────

export const CHAPTERS = [
  {
    index: 0,
    id: 'zi',
    branch: '子',
    branchEn: 'zǐ',
    name: '夜半',
    en: 'Midnight',
    hours: [23, 1],
    poem: '万籁俱寂，唯余潮声按秒涌动。',
    dataNote: '此刻的数据最安静——全球互联网流量的一日谷底，而潮汐仍按月球时刻表进退。',
    palette: { inner: '#8FB4FF', outer: '#CE8242', core: '#E8E8F4' },
    behavior: { flow: 0.034, noiseAmp: 0.14, sizeScale: 1.0, mouseStrength: 1.1, orbitAmp: 0.14, orbitTempo: 0.14, coreLift: 0.16, dotGain: 1.40 },
    soundscape: 'tide',
    energy: 0.2,
  },
  {
    index: 1,
    id: 'chou',
    branch: '丑',
    branchEn: 'chǒu',
    name: '鸡鸣',
    en: 'Cockcrow',
    hours: [1, 3],
    poem: '最深的夜里，机器仍在低鸣——这是无人机时代的守夜。',
    dataNote: '城市电网维持着基础负载；无人机在夜空中执行巡检与测绘。人类睡了，算法醒着。',
    palette: { inner: '#8FA8E8', outer: '#B76F36', core: '#E4D8CC' },
    behavior: { flow: 0.030, noiseAmp: 0.12, sizeScale: 0.95, mouseStrength: 0.9, orbitAmp: 0.11, orbitTempo: 0.10, coreLift: 0.14, dotGain: 1.45 },
    soundscape: 'drone',
    energy: 0.15,
  },
  {
    index: 2,
    id: 'yin',
    branch: '寅',
    branchEn: 'yín',
    name: '平旦',
    en: 'Daybreak-eve',
    hours: [3, 5],
    poem: '天未亮，雾先醒。',
    dataNote: '凌晨的物流干线开始预热，第一批货车驶上高速；机场迎来第一波早班航班。',
    palette: { inner: '#A9C6DE', outer: '#D89A55', core: '#F4F0E4' },
    behavior: { flow: 0.040, noiseAmp: 0.16, sizeScale: 1.0, mouseStrength: 1.2, orbitAmp: 0.18, orbitTempo: 0.17, coreLift: 0.18, dotGain: 1.35 },
    soundscape: 'drift',
    energy: 0.3,
  },
  {
    index: 3,
    id: 'mao',
    branch: '卯',
    branchEn: 'mǎo',
    name: '日出',
    en: 'Sunrise',
    hours: [5, 7],
    poem: '第一缕数据流涌出地平线。',
    dataNote: '新闻与晨间推送的第一波洪峰；太阳高度角每十分钟改变一次城市的光谱。',
    palette: { inner: '#FFC08A', outer: '#E8737C', core: '#FFEBD2' },
    behavior: { flow: 0.042, noiseAmp: 0.19, sizeScale: 1.05, mouseStrength: 1.6, orbitAmp: 0.24, orbitTempo: 0.24, coreLift: 0.22 },
    soundscape: 'bloom',
    energy: 0.5,
  },
  {
    index: 4,
    id: 'chen',
    branch: '辰',
    branchEn: 'chén',
    name: '食时',
    en: 'Breakfast-hour',
    hours: [7, 9],
    poem: '城市苏醒，亿万人开始移动。',
    dataNote: '通勤早高峰：地铁、公交、骑行的轨迹在两小时内达到晨间峰值——城市的心跳此刻最快。',
    palette: { inner: '#7FE0CE', outer: '#2E8FA6', core: '#DCFFF6' },
    behavior: { flow: 0.055, noiseAmp: 0.21, sizeScale: 1.05, mouseStrength: 1.8, orbitAmp: 0.27, orbitTempo: 0.27, coreLift: 0.24 },
    soundscape: 'pulse',
    energy: 0.7,
  },
  {
    index: 5,
    id: 'si',
    branch: '巳',
    branchEn: 'sì',
    name: '隅中',
    en: 'Mid-morning',
    hours: [9, 11],
    poem: '风起于青萍之末。',
    dataNote: '数据接口：大西洋风场（NOAA GFS）——风的路径每六小时更新一次，气旋在暖洋面上转身。',
    palette: { inner: '#8FE8FF', outer: '#2F8FBF', core: '#E4F9FF' },
    behavior: { flow: 0.065, noiseAmp: 0.26, sizeScale: 1.0, mouseStrength: 2.0, orbitAmp: 0.31, orbitTempo: 0.31, coreLift: 0.26 },
    soundscape: 'storm',
    energy: 0.75,
  },
  {
    index: 6,
    id: 'wu',
    branch: '午',
    branchEn: 'wǔ',
    name: '日中',
    en: 'Noon',
    hours: [11, 13],
    poem: '阳气最盛，万物显形。',
    dataNote: '交易与支付的午间峰值；太阳达到最高点，北半球的卫星云图亮度达到一日之最。',
    palette: { inner: '#FFE58A', outer: '#FF9A3D', core: '#FFF8DA' },
    behavior: { flow: 0.070, noiseAmp: 0.29, sizeScale: 1.15, mouseStrength: 2.2, orbitAmp: 0.34, orbitTempo: 0.34, coreLift: 0.30 },
    soundscape: 'pulse',
    energy: 1.0,
  },
  {
    index: 7,
    id: 'wei',
    branch: '未',
    branchEn: 'wèi',
    name: '日昳',
    en: 'Afternoon',
    hours: [13, 15],
    poem: '鱼群在远方转向，逆流而上。',
    dataNote: '数据接口：黑龙江大马哈鱼洄游（GBIF 观测记录）——秋汛时节，它们从鄂霍次克海游回出生的河。',
    palette: { inner: '#FFCE96', outer: '#D97B54', core: '#FFE9CE' },
    behavior: { flow: 0.050, noiseAmp: 0.21, sizeScale: 1.05, mouseStrength: 1.7, orbitAmp: 0.27, orbitTempo: 0.25, coreLift: 0.24 },
    soundscape: 'tide',
    energy: 0.6,
  },
  {
    index: 8,
    id: 'shen',
    branch: '申',
    branchEn: 'shēn',
    name: '哺时',
    en: 'Late-afternoon',
    hours: [15, 17],
    poem: '云聚了起来，雨在数据里落下。',
    dataNote: '午后对流天气：降水雷达回波在大陆上聚集，一小时内一场雷暴可以释放十次广岛原子弹的能量。',
    palette: { inner: '#B4CFE8', outer: '#64809F', core: '#E8F1FA' },
    behavior: { flow: 0.060, noiseAmp: 0.23, sizeScale: 1.0, mouseStrength: 1.9, orbitAmp: 0.29, orbitTempo: 0.28, coreLift: 0.26 },
    soundscape: 'storm',
    energy: 0.65,
  },
  {
    index: 9,
    id: 'you',
    branch: '酉',
    branchEn: 'yǒu',
    name: '日入',
    en: 'Sunset',
    hours: [17, 19],
    poem: '落日熔金，暮云合璧。',
    dataNote: '晚高峰回流：人流从写字楼涌向车站与餐桌；日落时刻由纬度和季节精确决定。',
    palette: { inner: '#FFA17A', outer: '#AD4768', core: '#FFDCC6' },
    behavior: { flow: 0.045, noiseAmp: 0.18, sizeScale: 1.05, mouseStrength: 1.6, orbitAmp: 0.26, orbitTempo: 0.23, coreLift: 0.22 },
    soundscape: 'tide',
    energy: 0.5,
  },
  {
    index: 10,
    id: 'xu',
    branch: '戌',
    branchEn: 'xū',
    name: '黄昏',
    en: 'Dusk',
    hours: [19, 21],
    poem: '万家灯火次第亮起。',
    dataNote: '城市灯光沿街道次第点亮——夜光遥感卫星看得见人类文明的作息；流媒体晚高峰开始。',
    palette: { inner: '#FFDD9A', outer: '#C0603F', core: '#FFF1CC' },
    behavior: { flow: 0.038, noiseAmp: 0.16, sizeScale: 1.0, mouseStrength: 1.5, orbitAmp: 0.22, orbitTempo: 0.19, coreLift: 0.20 },
    soundscape: 'bloom',
    energy: 0.45,
  },
  {
    index: 11,
    id: 'hai',
    branch: '亥',
    branchEn: 'hài',
    name: '人定',
    en: 'Rest',
    hours: [21, 23],
    poem: '人定，数据仍在流淌。',
    dataNote: '个人设备退回待机，全球流量曲线缓缓沉入谷底——但数据从不真正入睡。',
    palette: { inner: '#8093E0', outer: '#C8813F', core: '#E8E0D0' },
    behavior: { flow: 0.036, noiseAmp: 0.14, sizeScale: 1.0, mouseStrength: 1.1, orbitAmp: 0.14, orbitTempo: 0.13, coreLift: 0.16, dotGain: 1.40 },
    soundscape: 'drift',
    energy: 0.25,
  },
]

// 十二时辰从子时（23:00）起算
export const CHAPTER_MS = 2 * 60 * 60 * 1000

/**
 * 真实时钟 → 时辰索引与进度
 * 23:00 → 0（子）；01:00 → 1（丑）；11:00 → 6（午）；21:00 → 11（亥）
 */
export function chapterClockAt(date = new Date()) {
  const hoursSinceZi =
    ((date.getHours() + 1) % 24) + date.getMinutes() / 60 + date.getSeconds() / 3600
  const index = Math.floor(hoursSinceZi / 2) % 12
  const progress = (hoursSinceZi % 2) / 2
  return { index, progress }
}

export function chapterByBranch(branch) {
  return CHAPTERS.find((c) => c.branch === branch) || null
}

export function chapterById(id) {
  return CHAPTERS.find((c) => c.id === id) || null
}
