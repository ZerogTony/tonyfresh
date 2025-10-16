export const vertexShader = `
  uniform float uScrollIntensity;
  uniform float uTransition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Fade out distortion during transition (1.0 - uTransition makes it go to 0)
    float distortionMultiplier = 1.0 - uTransition;
    float sideDistortion = sin(uv.y * 3.14159) * uScrollIntensity * 0.5 * distortionMultiplier;
    float topBottomDistortion = sin(uv.x * 3.14159) * uScrollIntensity * 0.2 * distortionMultiplier;
    pos.z += sideDistortion + topBottomDistortion;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

export const fragmentShader = `
  uniform sampler2D uCurrentTexture;
  uniform sampler2D uNextTexture;
  uniform float uScrollPosition;
  uniform float uTransition;
  varying vec2 vUv;

  void main() {
    float normalizedPosition = fract(uScrollPosition);

    vec2 currentUv = vec2(vUv.x, mod(vUv.y - normalizedPosition, 1.0));
    vec2 nextUv = vec2(vUv.x, mod(vUv.y + 1.0 - normalizedPosition, 1.0));

    // During transition, lock to current texture only
    if (uTransition > 0.001) {
      gl_FragColor = texture2D(uCurrentTexture, vUv);
    } else if (vUv.y < normalizedPosition) {
      gl_FragColor = texture2D(uNextTexture, nextUv);
    } else {
      gl_FragColor = texture2D(uCurrentTexture, currentUv);
    }
  }
`
