precision highp float;

varying float vSpeed;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;

  float intensity = pow(1.0 - smoothstep(0.0, 0.5, r), 1.5);

  vec3 lowColor  = vec3(0.40, 0.70, 1.00);
  vec3 midColor  = vec3(1.00, 0.85, 0.40);
  vec3 highColor = vec3(1.00, 0.30, 0.20);

  float t = smoothstep(3.0, 18.0, vSpeed);
  vec3 col = mix(lowColor, midColor, smoothstep(0.0, 0.5, t));
  col = mix(col, highColor, smoothstep(0.5, 1.0, t));

  gl_FragColor = vec4(col * intensity, intensity);
}