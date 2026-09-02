// 声音场景预设
// 每个 preset 是声明式节点配置 + 元数据 + beat detection 参数
// AudioController 在 mode 变化时 dispose 旧节点、按 preset 创建新节点

export const presets = {
  // 1. Drift —— 极简 ambient drone，5 个 sine + LFO 缓慢演化
  drift: {
    id: 'drift',
    label: 'Drift',
    description: 'pure ambient drone',
    descZh: '平流 · 极简长音底噪：低频缓缓推着云流动',
    available: true,
    nodes: [
      { type: 'Oscillator', id: 'osc1', freq: 55,   wave: 'sine', volume: -8  },
      { type: 'Oscillator', id: 'osc2', freq: 82.5, wave: 'sine', volume: -12 },
      { type: 'Oscillator', id: 'osc3', freq: 110,  wave: 'sine', volume: -22 },
      { type: 'LFO',       id: 'lfo1',   freq: '4m', target: 'osc1.frequency', range: [50, 58] },
      { type: 'LFO',       id: 'lfo2',   freq: '3m', target: 'osc2.frequency', range: [78, 87] },
      { type: 'LFO',       id: 'ampLfo', freq: '8m', target: 'masterGain',     range: [-6, 0] },
      { type: 'Filter',    id: 'filter', kind: 'lowpass', freq: 800, Q: 1 },
      { type: 'Gain',      id: 'masterGain', value: 0.0 },
    ],
    beatDetection: {
      enabled: true, threshold: 1.4, minInterval: 800, decay: 0.35,
    },
  },

  // 2. Bloom —— 温润呼吸感
  bloom: {
    id: 'bloom',
    label: 'Bloom',
    description: 'organic breathing',
    descZh: '呼吸 · 温润起伏：中频让粒子明暗一收一放',
    available: true,
    nodes: [
      { type: 'Oscillator', id: 'osc1', freq: 110, wave: 'sine',     volume: -10 },
      { type: 'Oscillator', id: 'osc2', freq: 165, wave: 'sine',     volume: -12 },
      { type: 'Oscillator', id: 'osc3', freq: 220, wave: 'triangle', volume: -20 },
      { type: 'LFO',    id: 'lfo1',     freq: '12s', target: 'osc1.frequency', range: [105, 115] },
      { type: 'LFO',    id: 'lfo2',     freq: '8s',  target: 'osc2.frequency', range: [160, 170] },
      { type: 'LFO',    id: 'breathLfo',freq: '6s',  target: 'masterGain',     range: [-4, 0] },
      { type: 'Filter', id: 'filter',   kind: 'lowpass', freq: 600, Q: 1.5 },
      { type: 'Gain',   id: 'masterGain', value: 0.0 },
    ],
    beatDetection: {
      enabled: true, threshold: 1.5, minInterval: 1500, decay: 0.5,
    },
  },

  // 3. Pulse —— 心跳节拍
  pulse: {
    id: 'pulse',
    label: 'Pulse',
    description: 'rhythmic heartbeat',
    descZh: '脉搏 · 心跳节拍：鼓点让星云一阵阵舒张',
    available: true,
    nodes: [
      { type: 'Oscillator', id: 'osc1', freq: 55,   wave: 'sine',     volume: -8  },
      { type: 'Oscillator', id: 'osc2', freq: 82.5, wave: 'sine',     volume: -12 },
      { type: 'Oscillator', id: 'osc3', freq: 110,  wave: 'triangle', volume: -20 },
      { type: 'LFO',       id: 'lfo1',    freq: '4m',  target: 'osc1.frequency', range: [50, 58] },
      { type: 'LFO',       id: 'lfo2',    freq: '3m',  target: 'osc2.frequency', range: [78, 87] },
      { type: 'LFO',       id: 'sawLfo',  freq: '12s', target: 'osc3.frequency', range: [100, 220] },
      { type: 'SequenceKick', id: 'kick', interval: '4s', volume: -6 },
      { type: 'Filter',    id: 'filter', kind: 'lowpass', freq: 1200, Q: 1 },
      { type: 'Gain',      id: 'masterGain', value: 0.0 },
    ],
    beatDetection: {
      enabled: true, threshold: 1.3, minInterval: 1500, decay: 0.5,
    },
  },

  // 4. Storm —— 白噪音 + 风感
  storm: {
    id: 'storm',
    label: 'Storm',
    description: 'atmospheric noise',
    descZh: '风暴 · 风噪掠过：高频沙沙如尘埃躁动',
    available: true,
    nodes: [
      { type: 'Noise',     id: 'noise', kind: 'white', volume: -22 },
      { type: 'Filter',    id: 'windFilter', kind: 'bandpass', freq: 400, Q: 1.5 },
      { type: 'LFO',       id: 'windLfo', freq: '3s', target: 'windFilter.frequency', range: [200, 800] },
      { type: 'Oscillator',id: 'sub', freq: 45, wave: 'sawtooth', volume: -18 },
      { type: 'LFO',       id: 'subLfo', freq: '7s', target: 'sub.frequency', range: [40, 60] },
      { type: 'Filter',    id: 'lowpass', kind: 'lowpass', freq: 2000, Q: 1 },
      { type: 'Gain',      id: 'masterGain', value: 0.0 },
    ],
    beatDetection: {
      enabled: true, threshold: 1.3, minInterval: 600, decay: 0.3,
    },
  },

  // 5. Tide —— 30 秒一个潮汐周期
  tide: {
    id: 'tide',
    label: 'Tide',
    description: 'slow tidal motion',
    descZh: '潮汐 · 三十秒一轮涨落：云如潮水聚散',
    available: true,
    nodes: [
      { type: 'Oscillator', id: 'osc1', freq: 73,  wave: 'sine', volume: -10 },
      { type: 'Oscillator', id: 'osc2', freq: 110, wave: 'sine', volume: -14 },
      { type: 'LFO',       id: 'tideLfo', freq: '30s', target: 'masterGain',     range: [-12, 0] },
      { type: 'LFO',       id: 'oscLfo',  freq: '20s', target: 'osc1.frequency', range: [70, 80] },
      { type: 'Filter',    id: 'filter',  kind: 'lowpass', freq: 500, Q: 1 },
      { type: 'Gain',      id: 'masterGain', value: 0.0 },
    ],
    beatDetection: {
      enabled: false,
    },
  },

  // 6. Drone —— 无人机活动 / 人造蜂鸣
  drone: {
    id: 'drone',
    label: 'Drone',
    description: 'human-made hum / a record of the drone age',
    descZh: '低鸣 · 多旋翼的蜂鸣：无人机时代的声迹',
    available: true,
    nodes: [
      // 主蜂鸣：双 saw + 5 度失谐，模拟多旋翼电机共振
      { type: 'Oscillator', id: 'drone1', freq: 220, wave: 'sawtooth', volume: -14 },
      { type: 'Oscillator', id: 'drone2', freq: 221.5, wave: 'sawtooth', volume: -14 }, // 1.5Hz 失谐
      { type: 'Oscillator', id: 'drone3', freq: 330, wave: 'sawtooth', volume: -18 }, // 5 度
      // 缓慢的桨叶频率调制
      { type: 'LFO', id: 'bladeLfo1', freq: '2s',  target: 'drone1.frequency', range: [215, 225] },
      { type: 'LFO', id: 'bladeLfo2', freq: '2.3s', target: 'drone2.frequency', range: [216, 226] },
      // 距离感感：模拟"无人机靠近/远去"的 doppler 音量起伏
      { type: 'LFO', id: 'approachLfo', freq: '45s', target: 'masterGain', range: [-18, -4] },
      // 信号处理器：低通模拟"远处"的滤波感
      { type: 'Filter', id: 'lowpass', kind: 'lowpass', freq: 1400, Q: 2 },
      { type: 'Gain',   id: 'masterGain', value: 0.0 },
    ],
    beatDetection: {
      enabled: false, // 故意关闭：无人机蜂鸣本身没有鼓点
    },
  },
}

// UI 显示顺序（Drone 加在最后，强调"对未来可能的声音")
export const presetOrder = ['drift', 'bloom', 'pulse', 'storm', 'tide', 'drone']