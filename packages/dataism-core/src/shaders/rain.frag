precision highp float;

varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  // 上下拉长成竖条
  uv.y *= 4.0;
  float r = length(uv);
  if (r > 0.5) discard;

  float intensity = (1.0 - smoothstep(0.0, 0.5, r)) * 1.0;
  gl_FragColor = vec4(vec3(intensity), intensity * vAlpha);
}