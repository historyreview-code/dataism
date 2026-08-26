precision highp float;

// 主题雨色（由章节引擎注入；默认纯白 = v1.0 原版）
uniform vec3 uRainColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  // 上下拉长成竖条
  uv.y *= 4.0;
  float r = length(uv);
  if (r > 0.5) discard;

  float intensity = (1.0 - smoothstep(0.0, 0.5, r)) * 1.0;
  gl_FragColor = vec4(uRainColor * intensity, intensity * vAlpha);
}
