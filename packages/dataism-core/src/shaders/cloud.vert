precision highp float;

// 'position' 由 Three.js ShaderMaterial 自动注入，不要重复声明
attribute float aSeed;          // 每粒子随机种子 0..1
attribute float aSize;          // 每粒子尺寸倍率

uniform float uTime;
uniform vec2  uMouse;           // 鼠标位置（归一化到大致 -1..1）
uniform float uMouseStrength;
uniform float uPixelRatio;
uniform float uSizeBase;
uniform vec2  uClickPos;        // 点击位置（粒子场坐标）
uniform float uClickTime;       // 点击瞬间的 uTime
uniform float uClickStrength;   // 0~1，自动衰减
uniform float uAudioLow;        // 频谱低频能量 0~1
uniform float uAudioMid;        // 频谱中频能量 0~1
uniform float uAudioHigh;       // 频谱高频能量 0~1
uniform float uAudioBeat;       // 鼓点脉冲 0~1（自动衰减）

// —— 主题行为参数（由章节引擎注入；默认值 = v1.0 原版行为）——
uniform float uFlowSpeed;       // 水平流场速度（原 0.04）
uniform float uNoiseAmp;        // 噪声扰动幅度（原 0.18）
uniform float uSizeScale;       // 粒子尺寸整体缩放（原 1.0）
uniform float uOrbitAmp;        // 星云轨道场摆幅（rad，默认 0 = 关闭）
uniform float uOrbitTempo;      // 星云轨道场节奏（rad/s，默认 0 = 关闭）
uniform float uPointEnv;        // 分辨率环境系数（dpr × 视口高度补偿，默认 1.0 = 不补偿）
uniform float uCoreLift;        // 中央粒子尺寸增益（默认 0 = 关闭）
uniform float uDotGain;         // 亮核增益（默认 1.0 = v1.0 原样）
// ── v1.4 章节转场仪式 ──
uniform float uTransitionFreeze; // 0=正常, 1=完全凝滞
uniform float uTransitionRing;   // 冲击波环半径, <0=未激活

varying float vSeed;
varying float vAlpha;
varying float vRadius;

varying float vSeed;
varying float vAlpha;
varying float vRadius;

// 噪声函数（inline，因为 ShaderMaterial 不支持 #include 跨文件）
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec3 pos = position;
  float radial = length(pos.xy);  // 距中心距离（用于控制扰动范围）

  // —— 星云轨道场：粒子沿椭圆带做差速摆动（星系密度波的呼吸）
  //    在归一化圆空间旋转，再映射回椭圆 —— 水平剪影永不变形；
  //    相位随半径偏移（rNorm*2.4）产生"旋臂扫过"的层次感。
  //    默认 amp=0 → ang=0 → cos=1/sin=0 → 完全等于原 position（v1.0 零回归）。
  vec2 nz = vec2(position.x / 3.2, position.y / 0.9);
  float rNorm = length(nz);
  float orbAng = uOrbitAmp * (0.55 + 0.85 * rNorm)
               * sin(uTime * uOrbitTempo + rNorm * 2.4);
  float cA = cos(orbAng);
  float sA = sin(orbAng);
  vec2 nzRot = vec2(nz.x * cA - nz.y * sA, nz.x * sA + nz.y * cA);
  pos.xy = nzRot * vec2(3.2, 0.9);

  // —— 动效：水平流场（粒子缓慢穿过视野，速度温和）
  //    低频让流场加速：让粒子随低频"涌出"
  //    v1.4 转场凝滞：uTransitionFreeze 接近 1 时流速降到接近 0
  float flowSpeed = uFlowSpeed * (1.0 + uAudioLow * 0.7) * (1.0 - uTransitionFreeze);
  float xRange = 5.0;
  pos.x = mod(pos.x + uTime * flowSpeed + xRange * 0.5, xRange) - xRange * 0.5;
  //    低频让流场加速：让粒子随低频"涌出"
  float flowSpeed = uFlowSpeed * (1.0 + uAudioLow * 0.7);
  float xRange = 5.0;
  pos.x = mod(pos.x + uTime * flowSpeed + xRange * 0.5, xRange) - xRange * 0.5;

  // —— 动效：噪声扰动（**只作用在外圈**，中心区保持稳定避免光斑）
  //   中频放大扰动：让椭圆随中频"鼓动"
  float outerMask = smoothstep(0.3, 0.6, radial);
  float t = uTime * 0.15;
  float n1 = snoise(vec3(pos.xy * 0.5, t + aSeed * 10.0));
  float n2 = snoise(vec3(pos.xy * 0.25 + 5.0, t * 0.5 + aSeed * 3.0));
  float audioScale = 1.0 + uAudioMid * 0.9;
  pos.x += n1 * uNoiseAmp * outerMask * audioScale;
  pos.y += n2 * uNoiseAmp * outerMask * audioScale;
  pos.z += n1 * n2 * (uNoiseAmp * 0.55) * outerMask * audioScale;

  // —— 动效：高频抖动（让粒子随高频"沙沙"振动）
  float jitter = uAudioHigh * 0.06;
  pos.xy += vec2(
    sin(uTime * 50.0 + aSeed * 100.0),
    cos(uTime * 47.0 + aSeed * 100.0)
  ) * jitter;

  // —— 动效：鼓点迸发（径向扩张，幅度收细）
  pos.xy += normalize(pos.xy + 1e-5) * uAudioBeat * 0.12;
  pos.z  += uAudioBeat * 0.06;

  // —— 动效：鼠标扰动（微调：以切向扰动为主、横向拉长的椭圆影响域，避免圆形重力场观感）
  vec2 toMouse = uMouse - pos.xy;
  vec2 anisotropic = vec2(toMouse.x * 1.55, toMouse.y * 0.72);
  float d = length(anisotropic);
  float radius = 1.7;
  float falloff = smoothstep(radius, 0.0, d) * 0.45;
  vec2 tangent = vec2(-toMouse.y, toMouse.x);
  vec2 swirl = normalize(tangent + 1e-5) * falloff * uMouseStrength;
  vec2 attract = normalize(toMouse + 1e-5) * falloff * uMouseStrength * 0.22;
  pos.xy += swirl * 0.22 + attract * 0.10;
  pos.z  += falloff * uMouseStrength * 0.05;

  // —— click 冲击波：从 uClickPos 扩散的环，强度按 uClickStrength 自动衰减
  vec2 toClick = pos.xy - uClickPos;
  float dc = length(toClick);
  float waveR = (uTime - uClickTime) * 2.5;          // 环扩张速度（温和）
  float ringWidth = 0.6;
  float ring = exp(-pow(dc - waveR, 2.0) / (ringWidth * ringWidth));
  pos.xy += normalize(toClick + 1e-5) * ring * uClickStrength * 0.3;

  // ── v1.4 章节转场仪式：环形冲击波从中心向外扫过 ──
  if (uTransitionRing > 0.0) {
    float dCenter = length(pos.xy);
    float tRingWidth = 0.45;
    float tRing = exp(-pow(dCenter - uTransitionRing, 2.0) / (tRingWidth * tRingWidth));
    // 冲击波：径向轻推 + 纵向微压，制造"气浪"感
    vec2 radial = normalize(pos.xy + 1e-5);
    pos.xy += radial * tRing * 0.18;
    pos.z  += tRing * 0.08;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vec2 toClick = pos.xy - uClickPos;
  float dc = length(toClick);
  float waveR = (uTime - uClickTime) * 2.5;          // 环扩张速度（温和）
  float ringWidth = 0.6;
  float ring = exp(-pow(dc - waveR, 2.0) / (ringWidth * ringWidth));
  pos.xy += normalize(toClick + 1e-5) * ring * uClickStrength * 0.3;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // 粒子尺寸：中心区粒子**调小**，避免累加成光斑；外圈保留
  // r < 0.4 → 缩小到 60%；r > 0.6 → 100%（不要把中心挖空）
  float sizeMask = mix(0.6, 1.0, smoothstep(0.3, 0.6, radial));
  // —— 分辨率自适应：gl_PointSize 是绝对像素，大窗/HiDPI 下相对面积缩小导致云变稀薄；
  //    uPointEnv 按 dpr×视口高度补偿（默认 1.0 = v1.0 原样），让观感密度跨窗口稳定
  // —— 中央存在感：coreBoost 随归一化半径向内增强（默认 0 = 原样），放大的近景里核心不再"消失"
  float coreBoost = 1.0 + uCoreLift * (1.0 - smoothstep(0.08, 0.78, rNorm));
  float baseSize = mix(2.5, 6.0, aSize) * sizeMask * uSizeScale * uPointEnv;
  gl_PointSize = baseSize * coreBoost;

  vSeed = aSeed;
  vAlpha = 1.0;
  // 用**初始** position 算椭圆归一化距离（x∈[-3.2,3.2]、y∈[-0.9,0.9]）
  // 这样 vRadius 范围在椭圆边界 = 1.0，不论 x 还是 y 方向都能映射到 0~1
  vRadius = length(vec2(position.x / 3.2, position.y / 0.9));
}