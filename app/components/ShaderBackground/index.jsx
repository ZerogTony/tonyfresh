import React, { useEffect, useMemo, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'
import * as reactSpring from '@react-spring/three'

const DEFAULT_PROJECT_ID = 'ffmag'

const BASE_COLORS = {
  sazy: '#3e5aa4',
  ffmag: '#83715f',
  popeyes: '#937284',
  boxpark: '#fffd3c',
  spotify: '#eeeeee',
  stoli: '#ff0042',
  'turning-tide': '#a28a70',
  'idris-elba': '#000000',
  ocb: '#dcd2c8',
  'jack-daniels': '#808080',
  inbound: '#fdcb47'
}

const PRESET_URLS = {
  ffmag: 'https://www.shadergradient.co/customize?animate=on&axesHelper=on&bgColor1=%23000000&bgColor2=%23000000&brightness=1.2&cAzimuthAngle=180&cDistance=2.9&cPolarAngle=95&cameraZoom=1&color1=%23ff6a1a&color2=%23c73c00&color3=%23cc0000&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=30&frameRate=10&grain=off&lightType=3d&pixelDensity=0.4&positionX=0&positionY=-0.2&positionZ=0&range=enabled&rangeEnd=40&rangeStart=0&reflection=0.1&rotationX=0&rotationY=0&rotationZ=225&shader=defaults&toggleAxis=false&type=waterPlane&uAmplitude=0&uDensity=2&uFrequency=5.5&uSpeed=0.1&uStrength=3.6&uTime=0.2&wireframe=false&zoomOut=false'
}

const COLOR_FIELDS = ['color1', 'color2', 'color3']
const COLOR_SMOOTH_FACTOR = 0.18

const STATIC_SHADER_PROPS = {
  control: 'props',
  animate: 'on',
  type: 'waterPlane',
  shader: 'defaults',
  lightType: '3d',
  envPreset: 'city',
  grain: 'off',
  brightness: 1.2,
  cAzimuthAngle: 180,
  cPolarAngle: 95,
  cDistance: 2.9,
  cameraZoom: 1,
  positionX: 0,
  positionY: -0.2,
  positionZ: 0,
  reflection: 0.1,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 225,
  uAmplitude: 0,
  uDensity: 2,
  uFrequency: 5.5,
  uSpeed: 0.1,
  uStrength: 3.6,
  uTime: 0.2,
  pixelDensity: 0.4,
  toggleAxis: false,
  range: 'enabled',
  rangeStart: 0,
  rangeEnd: 40,
  zoomOut: false,
  axesHelper: 'on',
  destination: 'onCanvas',
  embedMode: 'off'
}

function makeDefaultColorSet (hex) {
  const base = hex && hex.startsWith('#') ? hex : `#${hex || '000000'}`
  return [base, base, base]
}

function makeDefaultProps (hex) {
  const [color1, color2, color3] = makeDefaultColorSet(hex)
  return sanitizeColorSet({
    color1,
    color2,
    color3
  })
}

function parsePresetUrl (urlString, fallbackColor) {
  try {
    const parsed = new URL(urlString, window.location.origin)
    const params = parsed.searchParams

    const props = {}

    params.forEach((value, key) => {
      if (!COLOR_FIELDS.includes(key)) return
      props[key] = decodeURIComponent(value.trim())
    })

    if (!props.color1 || !props.color2 || !props.color3) {
      const [c1, c2, c3] = makeDefaultColorSet(fallbackColor)
      props.color1 = props.color1 || c1
      props.color2 = props.color2 || c2
      props.color3 = props.color3 || c3
    }

    return sanitizeColorSet(props)
  } catch (error) {
    console.error('[ShaderBackground] Failed to parse preset URL', urlString, error)
    return sanitizeColorSet(makeDefaultProps(fallbackColor))
  }
}

function parseHexColor (hex) {
  const normalized = hex.startsWith('#') ? hex.substring(1) : hex
  const value = parseInt(normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  }
}

function componentToHex (component) {
  const value = Math.max(0, Math.min(255, Math.round(component)))
  return value.toString(16).padStart(2, '0')
}

function mixHex (a, b, t) {
  const ca = parseHexColor(a)
  const cb = parseHexColor(b)
  const mixed = {
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t
  }
  return `#${componentToHex(mixed.r)}${componentToHex(mixed.g)}${componentToHex(mixed.b)}`
}

function colorsAreClose (a, b, threshold = 1) {
  if (!a || !b) return a === b
  const ca = parseHexColor(normalizeHex(a))
  const cb = parseHexColor(normalizeHex(b))

  return (
    Math.abs(ca.r - cb.r) <= threshold &&
    Math.abs(ca.g - cb.g) <= threshold &&
    Math.abs(ca.b - cb.b) <= threshold
  )
}

function lerp (a, b, t) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.isFinite(a) ? a : b
  return a + (b - a) * t
}

function blendProps (current, next, t) {
  if (!current) return next
  if (!next || t <= 0) return current
  if (t >= 1) return next

  const blended = { ...current }

  COLOR_FIELDS.forEach((field) => {
    if (!current[field] || !next[field]) return
    blended[field] = mixHex(current[field], next[field], t)
  })

  return blended
}

function normalizeHex (hex) {
  if (!hex) return '#000000'
  return hex.startsWith('#') ? hex : `#${hex}`
}

function sanitizeColorSet ({ color1, color2, color3 }) {
  let c1 = normalizeHex(color1)
  let c2 = normalizeHex(color2)
  let c3 = normalizeHex(color3)

  const equals = (x, y) => x.toLowerCase() === y.toLowerCase()

  if (equals(c1, c2)) {
    c2 = mixHex(c2, '#ffffff', 0.25)
    if (equals(c1, c2)) {
      c2 = mixHex(c2, '#000000', 0.25)
    }
  }

  if (equals(c1, c3)) {
    c3 = mixHex(c3, '#000000', 0.3)
    if (equals(c1, c3)) {
      c3 = mixHex(c3, '#ffffff', 0.3)
    }
  }

  if (equals(c2, c3)) {
    c3 = mixHex(c3, '#ffffff', 0.2)
    if (equals(c2, c3)) {
      c3 = mixHex(c3, '#000000', 0.2)
    }
  }

  return {
    color1: c1,
    color2: c2,
    color3: c3
  }
}

const DEFAULT_COLOR_SET = makeDefaultColorSet(BASE_COLORS[DEFAULT_PROJECT_ID])

const PROJECT_PROPS = Object.keys(BASE_COLORS).reduce((acc, projectId) => {
  const url = PRESET_URLS[projectId]
  const parsed = url ? parsePresetUrl(url, BASE_COLORS[projectId]) : {}
  const [fallback1, fallback2, fallback3] = makeDefaultColorSet(BASE_COLORS[projectId])

  acc[projectId] = sanitizeColorSet({
    color1: parsed.color1 || fallback1,
    color2: parsed.color2 || fallback2,
    color3: parsed.color3 || fallback3
  })
  return acc
}, {})

PROJECT_PROPS.spotify = sanitizeColorSet({
  color1: '#45caff',
  color2: '#ff1b6b',
  color3: '#45caff'
})

PROJECT_PROPS['turning-tide'] = sanitizeColorSet({
  color1: '#9946b2',
  color2: '#eeb86d',
  color3: '#9946b2'
})

PROJECT_PROPS.ocb = sanitizeColorSet({
  color1: '#f4e900',
  color2: '#60b6f1',
  color3: '#f4e900'
})

PROJECT_PROPS['jack-daniels'] = sanitizeColorSet({
  color1: '#dff2cb',
  color2: '#f0a13a',
  color3: '#ee609a'
})

PROJECT_PROPS.inbound = sanitizeColorSet({
  color1: '#fcef04',
  color2: '#dc419b',
  color3: '#fcef04'
})

PROJECT_PROPS.sazy = sanitizeColorSet({
  color1: '#b429f9',
  color2: '#26c5f3',
  color3: '#b429f9'
})

PROJECT_PROPS.popeyes = sanitizeColorSet({
  color1: '#d8bdbe',
  color2: '#bd90e3',
  color3: '#cc575f'
})

function resolveProjectProps (projectId) {
  if (PROJECT_PROPS[projectId]) return PROJECT_PROPS[projectId]

  return sanitizeColorSet({
    color1: DEFAULT_COLOR_SET[0],
    color2: DEFAULT_COLOR_SET[1],
    color3: DEFAULT_COLOR_SET[2]
  })
}

function updateNavigationBackground (hex) {
  const navBgElement = document.querySelector('.navigation__background')
  if (navBgElement) {
    navBgElement.style.setProperty('--nav-bg-color', hex)
    navBgElement.style.background = hex
  }
}

function ShaderGradientPortal () {
  const defaultColorPropsRef = useRef(null)
  if (!defaultColorPropsRef.current) {
    defaultColorPropsRef.current = { ...resolveProjectProps(DEFAULT_PROJECT_ID) }
  }
  const defaultColorProps = defaultColorPropsRef.current

  const [progressState, setProgressState] = useState({
    currentId: DEFAULT_PROJECT_ID,
    nextId: null,
    t: 0
  })
  const [animatedColors, setAnimatedColors] = useState(defaultColorProps)
  const currentColorsRef = useRef(defaultColorProps)
  const targetColorsRef = useRef(defaultColorProps)
  const animationFrameRef = useRef(null)
  const overrideTargetRef = useRef(null)
  const [overrideTarget, setOverrideTarget] = useState(null)

  useEffect(() => {
    const handleScrollProgress = (event) => {
      const { currentId, nextId, t } = event.detail || {}
      if (!currentId) return
      setProgressState({
        currentId,
        nextId: nextId || null,
        t: typeof t === 'number' ? Math.max(0, Math.min(1, t)) : 0
      })
    }

    const handleProjectChange = (event) => {
      const { projectId } = event.detail || {}
      if (!projectId) return
      setProgressState({
        currentId: projectId,
        nextId: null,
        t: 0
      })
    }

    window.addEventListener('sliderScrollProgress', handleScrollProgress)
    window.addEventListener('sliderProjectChange', handleProjectChange)

    return () => {
      window.removeEventListener('sliderScrollProgress', handleScrollProgress)
      window.removeEventListener('sliderProjectChange', handleProjectChange)
    }
  }, [])

  const blendedProps = useMemo(() => {
    const currentProps = resolveProjectProps(progressState.currentId)
    const nextProps = progressState.nextId
      ? resolveProjectProps(progressState.nextId)
      : null
    return blendProps(currentProps, nextProps, progressState.t)
  }, [progressState])

  useEffect(() => {
    const target = overrideTargetRef.current || blendedProps || defaultColorProps
    if (!target) return

    targetColorsRef.current = target

    const step = () => {
      const current = currentColorsRef.current || defaultColorProps
      const desired = targetColorsRef.current || defaultColorProps

      const next = {}
      let needsMore = false

      COLOR_FIELDS.forEach((field) => {
        const fromColor = normalizeHex(current[field] || desired[field] || '#000000')
        const toColor = normalizeHex(desired[field] || fromColor)

        if (colorsAreClose(fromColor, toColor)) {
          next[field] = toColor
          return
        }

        const mixed = mixHex(fromColor, toColor, COLOR_SMOOTH_FACTOR)
        next[field] = mixed
        if (!colorsAreClose(mixed, toColor)) {
          needsMore = true
        }
      })

      currentColorsRef.current = next
      setAnimatedColors(next)

      if (needsMore) {
        animationFrameRef.current = requestAnimationFrame(step)
      } else {
        animationFrameRef.current = null
      }
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [overrideTarget, blendedProps, defaultColorProps])

  useEffect(() => {
    const handleOverride = (event) => {
      const detail = event.detail || {}
      const colors = detail.colors
      if (!colors) return

      const sanitized = sanitizeColorSet(colors)
      overrideTargetRef.current = sanitized
      setOverrideTarget(sanitized)
      targetColorsRef.current = sanitized

      if (detail.immediate) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        currentColorsRef.current = sanitized
        setAnimatedColors(sanitized)
      }
    }

    const handleOverrideClear = () => {
      overrideTargetRef.current = null
      setOverrideTarget(null)
    }

    window.addEventListener('shaderOverride', handleOverride)
    window.addEventListener('shaderOverrideClear', handleOverrideClear)

    return () => {
      window.removeEventListener('shaderOverride', handleOverride)
      window.removeEventListener('shaderOverrideClear', handleOverrideClear)
    }
  }, [])

  const shaderProps = useMemo(() => {
    if (!animatedColors) return null
    return {
      ...STATIC_SHADER_PROPS,
      ...animatedColors
    }
  }, [animatedColors])

  useEffect(() => {
    if (animatedColors?.color2) {
      updateNavigationBackground(animatedColors.color2)
    }
  }, [animatedColors?.color2])

  if (!shaderProps) return null

  return (
    <ShaderGradientCanvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
      reactSpring={reactSpring}
    >
      <ShaderGradient control='props' enableTransition={false} {...shaderProps} />
    </ShaderGradientCanvas>
  )
}

export default class ShaderBackground {
  constructor () {
    this.container = document.querySelector('.canvas__background')

    if (!this.container) {
      console.warn('[ShaderBackground] Missing .canvas__background container')
      return
    }

    this.rootElement = document.createElement('div')
    this.rootElement.style.position = 'fixed'
    this.rootElement.style.top = '0'
    this.rootElement.style.left = '0'
    this.rootElement.style.width = '100vw'
    this.rootElement.style.height = '100vh'
    this.rootElement.style.pointerEvents = 'none'
    this.rootElement.style.zIndex = '2'

    this.container.appendChild(this.rootElement)
    this.container.style.background = 'transparent'
    this.container.style.removeProperty('background-color')
    this.root = createRoot(this.rootElement)
    this.root.render(<ShaderGradientPortal />)
  }

  destroy () {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }

    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement)
    }
  }
}
