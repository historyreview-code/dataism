precision highp float;

attribute vec3 position;
attribute vec2 aVelocity;
attribute float aBaseSpeed;
attribute float aSeed;
attribute float aSize;

uniform float uTime;
uniform float uPixelRatio;
uniform float uStormLevel;

varying float vSpeed;

void main() {
  // position 已经是 NDC 坐标（JS 端投影过：x ∈ [-0.9, 0.9], y ∈ [-0.45, 0.45]）
  vec2 ndc = position.xy;

  // —— 风场推动（每帧位移，u/v 已经是 NDC 尺度）
  // x wrap：让粒子从右出去回到左
  float xRange = 1.8;
  ndc.x = mod(ndc.x + aVelocity.x * uTime * 0.4 + xRange * 0.5, xRange) - xRange * 0.5;
  ndc.y += aVelocity.y * uTime * 0.3;

  gl_Position = vec4(ndc, position.z, 1.0);

  // 粒子尺寸：风暴时 + 大风处粒子更显眼
  float sizeBoost = 1.0 + uStormLevel * 1.5 + smoothstep(8.0, 25.0, aBaseSpeed) * 0.5;
  gl_PointSize = (4.0 + aSize * 6.0) * sizeBoost * uPixelRatio;

  vSpeed = aBaseSpeed;
}