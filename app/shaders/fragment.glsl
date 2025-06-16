precision highp float;

uniform float uAlpha;
uniform float uMultiplier;
uniform sampler2D tMap;

varying float vDisplacement;
varying vec2 vUv;

void main() {
  vec4 textureColor = texture2D(tMap, vUv);

  // Optional: subtle displacement
  vec3 color = textureColor.rgb + vDisplacement * mix(0.1, 0.19, uMultiplier);

  // Final output with alpha fade
  gl_FragColor = vec4(color, textureColor.a * uAlpha);
}
