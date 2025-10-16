import * as THREE from 'three'
import AutoBind from 'auto-bind'
import GSAP from 'gsap'

// Lightweight shader-gradient style background implemented in vanilla Three.js
// Renders a full-screen animated gradient that can be color-driven by slider scroll

export default class ShaderBackground {
  constructor () {
    AutoBind(this)

    this.container = document.querySelector('.canvas__background')
    if (!this.container) return

    this.clock = new THREE.Clock()

    this.defaultParams = {
      speed: 0.25,
      frequency: 4.5,
      density: 1.2,
      strength: 1.0,
      amplitude: 0.08,
      brightness: 1.0,
      rotation: 0
    }

    this.projectConfigs = this.createProjectConfigs()
    this.defaultConfig = this.projectConfigs['ffmag'] || this.createDefaultConfig('#83715f')
    this.currentConfig = this.defaultConfig

    this.createRenderer()
    this.createScene()
    this.createMesh()
    this.updateNavBackground(this.currentConfig.colors[1])

    this.onResize()
    this.addEvents()
    this.update()
  }

  // Base color -> triad set
  makeSet (hex) {
    const { h, s, l } = this.hexToHsl(hex)
    const c1 = this.hslToHex(h, Math.min(100, s * 1.05), Math.min(100, l * 1.25))
    const c2 = this.hslToHex(h, s, l)
    const c3 = this.hslToHex((h + 15) % 360, Math.min(100, s * 0.9), Math.max(0, l * 0.75))
    return [c1, c2, c3]
  }

  createProjectConfigs () {
    // Single base colors copied from Home.changeBackgroundColor mapping
    const base = {
      'sazy': '#3e5aa4',
      'ffmag': '#83715f',
      'popeyes': '#937284',
      'boxpark': '#fffd3c',
      'spotify': '#eeeeee',
      'stoli': '#ff0042',
      'turning-tide': '#a28a70',
      'idris-elba': '#000000',
      'ocb': '#dcd2c8',
      'jack-daniels': '#808080',
      'inbound': '#fdcb47'
    }

    // Optional: drop a ShaderGradient preset URL per project here.
    const presetUrls = {
      // Example preset for FF Magazine using ShaderGradient's "waterPlane" look.
      ffmag: 'https://www.shadergradient.co/customize?animate=on&axesHelper=on&bgColor1=%23000000&bgColor2=%23000000&brightness=1.2&cAzimuthAngle=180&cDistance=2.4&cPolarAngle=95&cameraZoom=1&color1=%23ff6a1a&color2=%23c73c00&color3=%23FD4912&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=45&frameRate=10&grain=off&lightType=3d&pixelDensity=0.8&positionX=0&positionY=-2.1&positionZ=0&range=enabled&rangeEnd=40&rangeStart=0&reflection=0.1&rotationX=0&rotationY=0&rotationZ=225&shader=defaults&type=waterPlane&uAmplitude=0&uDensity=1.8&uFrequency=5.5&uSpeed=0&uStrength=3&uTime=0.2&wireframe=false'
    }

    const configs = {}
    Object.keys(base).forEach((id) => {
      const presetUrl = presetUrls[id]
      if (presetUrl) {
        configs[id] = this.parsePresetUrl(presetUrl, base[id])
      } else {
        configs[id] = this.createDefaultConfig(base[id])
      }
    })
    return configs
  }

  createDefaultConfig (hex) {
    return {
      colors: this.makeSet(hex),
      params: { ...this.defaultParams }
    }
  }

  parsePresetUrl (url, fallbackHex) {
    try {
      const parsed = new URL(url, window.location.origin)
      const params = parsed.searchParams

      const colorCandidates = [
        params.get('color1'),
        params.get('color2'),
        params.get('color3')
      ]

      const normalizedColors = colorCandidates.every(Boolean)
        ? colorCandidates.map((hex) => hex.trim())
        : this.makeSet(fallbackHex)

      const readFloat = (key, fallback) => {
        const value = parseFloat(params.get(key))
        return Number.isFinite(value) ? value : fallback
      }

      const rotationDeg = readFloat('rotationZ', this.radToDeg(this.defaultParams.rotation))
      const config = {
        colors: normalizedColors,
        params: {
          speed: readFloat('uSpeed', this.defaultParams.speed),
          frequency: readFloat('uFrequency', this.defaultParams.frequency),
          density: readFloat('uDensity', this.defaultParams.density),
          strength: readFloat('uStrength', this.defaultParams.strength),
          amplitude: readFloat('uAmplitude', this.defaultParams.amplitude),
          brightness: readFloat('brightness', this.defaultParams.brightness),
          rotation: this.degToRad(rotationDeg)
        }
      }

      return config
    } catch (error) {
      console.error('[ShaderBackground] Failed to parse preset URL', url, error)
      return this.createDefaultConfig(fallbackHex)
    }
  }

  resolveConfig (projectId) {
    if (!projectId) return this.defaultConfig
    return this.projectConfigs[projectId] || this.defaultConfig
  }

  createRenderer () {
    const dpr = Math.min(window.devicePixelRatio, 2)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    this.container.appendChild(this.renderer.domElement)
    const el = this.renderer.domElement
    el.style.position = 'fixed'
    el.style.top = '0'
    el.style.left = '0'
    el.style.width = '100vw'
    el.style.height = '100vh'
    el.style.pointerEvents = 'none'
    el.style.zIndex = '2'
  }

  createScene () {
    this.scene = new THREE.Scene()
    // Fullscreen quad with orthographic camera
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  createMesh () {
    const geometry = new THREE.PlaneGeometry(2, 2)

    const { colors, params } = this.currentConfig

    const uniforms = {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(colors[0]) },
      uColor2: { value: new THREE.Color(colors[1]) },
      uColor3: { value: new THREE.Color(colors[2]) },
      uSpeed: { value: params.speed },
      uFrequency: { value: params.frequency },
      uDensity: { value: params.density },
      uStrength: { value: params.strength },
      uAmplitude: { value: params.amplitude },
      uBrightness: { value: params.brightness },
      uRotation: { value: params.rotation }
    }
    this.uniforms = uniforms

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `

    // Simple moving gradient inspired by shadergradient behavior
    const fragmentShader = `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uSpeed;
      uniform float uFrequency;
      uniform float uDensity;
      uniform float uStrength;
      uniform float uAmplitude;
      uniform float uBrightness;
      uniform float uRotation;

      float safePow(float value, float power) {
        return pow(max(value, 0.0001), power);
      }

      void main() {
        vec2 uv = vUv;
        if (abs(uRotation) > 0.0001) {
          float cosA = cos(uRotation);
          float sinA = sin(uRotation);
          vec2 centered = uv - 0.5;
          uv = vec2(
            centered.x * cosA - centered.y * sinA,
            centered.x * sinA + centered.y * cosA
          ) + 0.5;
        }

        vec2 warped = uv;
        float warpAmount = 0.04 + uAmplitude * 0.04;
        warped += vec2(
          sin((uv.y * uFrequency) + uTime * uSpeed),
          cos((uv.x * (uFrequency * 0.85)) + uTime * (uSpeed * 1.1))
        ) * warpAmount;

        float fieldA = sin((warped.x + uTime * uSpeed) * (2.0 + uDensity));
        float fieldB = cos((warped.y - uTime * uSpeed * 0.8) * (2.0 + uDensity));

        float mixAB = clamp(0.5 + 0.5 * (fieldA + fieldB) * 0.5, 0.0, 1.0);
        mixAB = safePow(mixAB, 1.0 / max(uStrength, 0.0001));

        vec3 col = mix(uColor1, uColor2, mixAB);
        float third = clamp(0.5 + 0.5 * sin((warped.x + warped.y) * 0.5 * uFrequency + uTime * uSpeed * 0.6), 0.0, 1.0);
        col = mix(col, uColor3, third * 0.7);

        col *= uBrightness;
        col = clamp(col, 0.0, 1.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.scene.add(this.mesh)
  }

  addEvents () {
    window.addEventListener('resize', this.onResize)

    // Smoothly blend between current/next project color sets during scroll
    window.addEventListener('sliderScrollProgress', (e) => {
      const { currentId, nextId, t } = e.detail || {}
      if (!currentId) return

      const blend = this.blendConfigs(currentId, nextId, typeof t === 'number' ? t : 0)
      this.applyBlendedConfig(blend)
    })

    // When a project settles, ease into its target preset
    window.addEventListener('sliderProjectChange', (e) => {
      const { projectId } = e.detail || {}
      if (!projectId) return
      const config = this.resolveConfig(projectId)
      this.applyConfig(config, true)
    })
  }

  updateNavBackground (hex) {
    const navBgElement = document.querySelector('.navigation__background')
    if (!navBgElement) return
    navBgElement.style.setProperty('--nav-bg-color', hex)
    navBgElement.style.background = hex
  }

  blendConfigs (currentId, nextId, t) {
    const base = this.resolveConfig(currentId)
    const target = nextId ? this.resolveConfig(nextId) : base

    if (!base && !target) return null
    if (!target || !Number.isFinite(t)) return base

    const lerp = (start, end) => start + (end - start) * t

    return {
      colors: [
        this.mixHex(base.colors[0], target.colors[0], t),
        this.mixHex(base.colors[1], target.colors[1], t),
        this.mixHex(base.colors[2], target.colors[2], t)
      ],
      params: {
        speed: lerp(base.params.speed, target.params.speed),
        frequency: lerp(base.params.frequency, target.params.frequency),
        density: lerp(base.params.density, target.params.density),
        strength: lerp(base.params.strength, target.params.strength),
        amplitude: lerp(base.params.amplitude, target.params.amplitude),
        brightness: lerp(base.params.brightness, target.params.brightness),
        rotation: this.lerpAngle(base.params.rotation, target.params.rotation, t)
      }
    }
  }

  applyBlendedConfig (config) {
    if (!config) return
    this.setColors(config.colors)
    this.setParams(config.params)
    this.updateNavBackground(config.colors[1])
  }

  applyConfig (config, animate = false) {
    if (!config) return

    if (animate) {
      this.tweenToColors(config.colors, 0.6)
    } else {
      this.setColors(config.colors)
    }

    this.setParams(config.params)
    this.updateNavBackground(config.colors[1])
    this.currentConfig = config
  }

  setColors ([c1, c2, c3]) {
    this.uniforms.uColor1.value.set(c1)
    this.uniforms.uColor2.value.set(c2)
    this.uniforms.uColor3.value.set(c3)
  }

  setParams (params) {
    if (!params || !this.uniforms) return

    const { uSpeed, uFrequency, uDensity, uStrength, uAmplitude, uBrightness, uRotation } = this.uniforms

    if (uSpeed) uSpeed.value = params.speed
    if (uFrequency) uFrequency.value = params.frequency
    if (uDensity) uDensity.value = params.density
    if (uStrength) uStrength.value = params.strength
    if (uAmplitude) uAmplitude.value = params.amplitude
    if (uBrightness) uBrightness.value = params.brightness
    if (uRotation) uRotation.value = params.rotation
  }

  tweenToColors ([c1, c2, c3], duration = 0.6) {
    const col1 = this.uniforms.uColor1.value
    const col2 = this.uniforms.uColor2.value
    const col3 = this.uniforms.uColor3.value

    GSAP.to(col1, { r: new THREE.Color(c1).r, g: new THREE.Color(c1).g, b: new THREE.Color(c1).b, duration })
    GSAP.to(col2, { r: new THREE.Color(c2).r, g: new THREE.Color(c2).g, b: new THREE.Color(c2).b, duration })
    GSAP.to(col3, { r: new THREE.Color(c3).r, g: new THREE.Color(c3).g, b: new THREE.Color(c3).b, duration })
  }

  update () {
    if (!this.renderer) return
    const delta = this.clock.getDelta()
    this.uniforms.uTime.value += delta
    this.renderer.render(this.scene, this.camera)
    this.raf = requestAnimationFrame(this.update)
  }

  onResize () {
    if (!this.renderer) return
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  destroy () {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      this.mesh.material.dispose()
    }
    if (this.renderer) {
      const el = this.renderer.domElement
      if (el && el.parentNode) el.parentNode.removeChild(el)
      this.renderer.dispose()
    }
  }

  // Utils: color conversions & interpolation
  hexToHsl (hex) {
    const c = new THREE.Color(hex)
    const r = c.r, g = c.g, b = c.b
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h, s
    const l = (max + min) / 2
    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
  }

  hslToHex (h, s, l) {
    h /= 360; s /= 100; l /= 100
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    let r, g, b
    if (s === 0) { r = g = b = l } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    const toHex = (x) => ('0' + Math.round(x * 255).toString(16)).slice(-2)
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  mixHex (a, b, t) {
    const ca = new THREE.Color(a)
    const cb = new THREE.Color(b)
    const cr = ca.lerp(cb, t)
    return `#${cr.getHexString()}`
  }

  lerpAngle (a, b, t) {
    const tau = Math.PI * 2
    let delta = (b - a + Math.PI) % tau
    if (delta < 0) delta += tau
    delta -= Math.PI
    return a + delta * t
  }

  degToRad (deg) {
    return deg * (Math.PI / 180)
  }

  radToDeg (rad) {
    return rad * (180 / Math.PI)
  }
}
