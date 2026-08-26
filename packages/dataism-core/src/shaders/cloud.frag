precision highp float;

uniform float uTime;
uniform float uAudioBeat;
// —— 主题配色（由章节引擎注入；默认值 = v1.0 原版赛博蓝橙）——
uniform vec3 uColorInner;   // 内圈色
uniform vec3 uColorOuter;   // 外圈色
uniform vec3 uColorCore;    // 中央高光色
varying float vSeed;
varying float vAlpha;
varying float vRadius;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;

  // 中心非常亮、边缘立即消失
  float intensity = pow(1.0 - smoothstep(0.0, 0.5, r), 2.0);

  // 每粒子独立闪烁
  float flicker = 0.85 + 0.15 * sin(uTime * 2.0 + vSeed * 31.4);

  // —— 径向赛博配色：内圈冷蓝 → 外圈暖橙
  // vRadius 是椭圆归一化距离：中心 0，椭圆边界 ~1.0
  // 由于中央 r<0.3 区域粒子被剔到外圈，gradient 起点移到 0.3 让真正有粒子的区段才有渐变
  vec3 innerColor = uColorInner;
  vec3 outerColor = uColorOuter;
  float gradientT = smoothstep(0.3, 0.95, vRadius);
  vec3 baseColor = mix(innerColor, outerColor, gradientT);

  // 中央最内核（r<0.2）少量粒子保留蓝→白色高光（10% mix）
  float coreHighlight = smoothstep(0.0, 0.2, 0.2 - vRadius);
  baseColor = mix(baseColor, uColorCore, coreHighlight * 0.5);

  // —— 鼓点闪白（audio beat → 短暂提亮粒子）
  float beatFlash = uAudioBeat * 0.4;
  baseColor = mix(baseColor, vec3(1.0, 0.95, 0.9), beatFlash);

  gl_FragColor = vec4(baseColor * intensity * flicker, intensity);
}