precision highp float;

// 'position' 由 Three.js ShaderMaterial 自动注入
attribute float aSeed;
attribute float aSpeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uRainEnv;   // 分辨率环境系数（默认 1.0 = v1.0 原样）
uniform float uTransitionFreeze; // v1.4 转场凝滞：0=正常, 1=完全静止
uniform float uPixelRatio;
uniform float uRainEnv;   // 分辨率环境系数（默认 1.0 = v1.0 原样）

varying float vAlpha;

void main() {
  vec3 pos = position;

  // 让每条雨独立下落，超出底部 wrap 回顶部
  // v1.4 转场凝滞：freeze 接近 1 时雨滴几乎停止
  float timeScale = 1.0 - uTransitionFreeze;
  float yRange = 7.0;
  float ySpeed = aSpeed * 2.0 * timeScale;
  float y = mod(pos.y - uTime * ySpeed + yRange * 0.5, yRange) - yRange * 0.5;
  pos.y = y;

  // —— 动效 5：水平风力（让雨左右微微飘，不是死板垂直）
  float wind = sin(uTime * 0.7 * timeScale + pos.x * 0.5 + aSeed * 6.28) * 0.08
             + sin(uTime * 1.3 * timeScale + aSeed * 12.0) * 0.05;
  pos.x += wind * timeScale;
  float yRange = 7.0;
  float ySpeed = aSpeed * 2.0;
  float y = mod(pos.y - uTime * ySpeed + yRange * 0.5, yRange) - yRange * 0.5;
  pos.y = y;

  // —— 动效 5：水平风力（让雨左右微微飘，不是死板垂直）
  float wind = sin(uTime * 0.7 + pos.x * 0.5 + aSeed * 6.28) * 0.08
             + sin(uTime * 1.3 + aSeed * 12.0) * 0.05;
  pos.x += wind;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  gl_PointSize = (2.0 + aSeed * 3.0) * uRainEnv;

  // 越接近底部越淡（让雨"消失"）—— 大部分 y 范围里保持高 alpha
  float lifeTop = smoothstep(-3.5, -3.0, y);     // 顶部快速淡入
  float lifeBot = 1.0 - smoothstep(3.0, 3.5, y);  // 底部快速淡出
  vAlpha = lifeTop * lifeBot;
}