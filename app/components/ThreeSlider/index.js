import * as THREE from 'three'
import AutoBind from 'auto-bind'
import GSAP from 'gsap'
import { vertexShader, fragmentShader } from './shaders.js'
import Detection from 'classes/Detection'
import { lerp } from 'utils/math'

export default class ThreeSlider {
  constructor ({ projects, homeList }) {
    AutoBind(this)

    this.projects = projects
    this.homeList = homeList
    this.isMobile = Detection.isMobile()
    this.homeBaseScale = this.isMobile ? 0.6 : 0.35

    this.setSmoothingValues()

    this.scrollIntensity = 0
    this.targetScrollIntensity = 0
    this.maxScrollIntensity = 1.0

    this.scrollPosition = 0
    this.targetScrollPosition = 0

    this.isMoving = false

    this.stableCurrentIndex = 0
    this.stableNextIndex = 1
    this.isStable = false

    this.currentProjectIndex = 0
    this.lastEmittedProjectIndex = -1 // Track last emitted to avoid redundant events

    // Transition state
    this.transition = 0
    this.isTransitioning = false
    this.transitionStartBounds = null
    this.transitionTargetBounds = null
    this.initialPlaneDimensions = null // Store initial plane size for transitions
    this.scrollLocked = false // Lock scroll when positioned on case header
    this.lockedScale = null
    this.transitionTimeline = null
    this.pendingProjectId = null
    this.waitForSettleRaf = null
    this.transitionCompletionPromise = null
    this.transitionCompletionResolver = null

    this.screen = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    this.createRenderer()
    this.createCamera()
    this.createScene()
    this.loadTextures()
    this.createPlane()
    this.createCaseBounds()

    this.onResize()
    this.update()
  }

  setSmoothingValues () {
    const isMobile = this.isMobile

    this.scrollSmoothness = isMobile ? 0.7 : 0.6
    this.scrollPositionSmoothness = isMobile ? 0.12 : 0.09
    this.settleSmoothness = isMobile ? 0.18 : 0.14
    this.scrollDamping = isMobile ? 0.88 : 0.9
    this.scrollStopEpsilon = isMobile ? 0.0007 : 0.0005
    this.stableThreshold = isMobile ? 0.015 : 0.012
  }

  createRenderer () {
    const dpr = this.isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setClearColor(0xffffff, 0)

    // Append to .content container (the scrollable element) instead of body
    // Body has position:fixed, so absolute children won't scroll
    // .content has position:absolute and overflow:auto, so it's the actual scrollable container
    const contentContainer = document.querySelector('.content')
    if (contentContainer) {
      contentContainer.appendChild(this.renderer.domElement)
    } else {
      // Fallback to body if .content doesn't exist
      document.body.appendChild(this.renderer.domElement)
    }

    this.renderer.domElement.style.position = 'fixed'
    this.renderer.domElement.style.top = '0'
    this.renderer.domElement.style.left = '0'
    this.renderer.domElement.style.zIndex = '3'
    this.renderer.domElement.style.pointerEvents = 'none'
  }

  createCamera () {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.z = 5
  }

  createScene () {
    this.scene = new THREE.Scene()
  }

  loadTextures () {
    const textureLoader = new THREE.TextureLoader()

    this.textures = this.projects.map((project) => {
      // Get WebP or fallback to JPG
      const imageSrc = project.element.querySelector('.home__link__media').getAttribute(
        Detection.isWebPSupported() ? 'data-src-webp' : 'data-src'
      )

      const texture = textureLoader.load(
        imageSrc,
        undefined,
        undefined,
        () => {
          console.log(`Texture load error for ${imageSrc}`)
        }
      )
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      return texture
    })

    // Preload all textures
    this.textures.forEach((texture) => {
      texture.needsUpdate = true
    })
  }

  calculatePlaneDimensions () {
    const fov = this.camera.fov * (Math.PI / 180)
    const viewportHeight = 2 * Math.tan(fov / 2) * this.camera.position.z
    const viewportWidth = viewportHeight * this.camera.aspect

    const widthFactor = window.innerWidth < 900 ? 0.9 : 0.5
    const planeWidth = viewportWidth * widthFactor
    const planeHeight = planeWidth * (9 / 16)

    return { width: planeWidth, height: planeHeight }
  }

  createPlane () {
    const dimensions = this.calculatePlaneDimensions()

    // Store initial dimensions for transition calculations
    this.initialPlaneDimensions = {
      width: dimensions.width,
      height: dimensions.height
    }

    const geometry = new THREE.PlaneGeometry(
      dimensions.width,
      dimensions.height,
      32,
      32
    )

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      uniforms: {
        uScrollIntensity: { value: this.scrollIntensity },
        uScrollPosition: { value: this.scrollPosition },
        uTransition: { value: 0 },
        uCurrentTexture: { value: this.textures[0] },
        uNextTexture: { value: this.textures[1] },
      },
    })

    this.plane = new THREE.Mesh(geometry, material)
    this.scene.add(this.plane)

    if (!this.isTransitioning) {
      this.plane.scale.set(this.homeBaseScale, this.homeBaseScale, 1)
    }
  }

  getNearestScrollPosition (targetIndex) {
    if (!Number.isFinite(targetIndex)) return targetIndex

    const totalImages = this.projects.length
    if (!totalImages) return targetIndex

    const currentPosition = this.scrollPosition
    const wraps = Math.round((currentPosition - targetIndex) / totalImages)

    return targetIndex + (wraps * totalImages)
  }

  determineTextureIndices (position) {
    const totalImages = this.projects.length

    const baseIndex = Math.floor(position % totalImages)
    const positiveBaseIndex =
      baseIndex >= 0 ? baseIndex : (totalImages + baseIndex) % totalImages

    const nextIndex = (positiveBaseIndex + 1) % totalImages

    let normalizedPosition = position % 1
    if (normalizedPosition < 0) normalizedPosition += 1

    return {
      currentIndex: positiveBaseIndex,
      nextIndex: nextIndex,
      normalizedPosition: normalizedPosition,
    }
  }

  updateTextureIndices () {
    if (this.isStable) {
      this.plane.material.uniforms.uCurrentTexture.value = this.textures[this.stableCurrentIndex]
      this.plane.material.uniforms.uNextTexture.value = this.textures[this.stableNextIndex]
      return
    }

    const indices = this.determineTextureIndices(this.scrollPosition)

    this.plane.material.uniforms.uCurrentTexture.value = this.textures[indices.currentIndex]
    this.plane.material.uniforms.uNextTexture.value = this.textures[indices.nextIndex]
  }

  emitProjectChange (projectIndex) {
    // Only emit if the project actually changed
    if (projectIndex !== this.lastEmittedProjectIndex) {
      this.lastEmittedProjectIndex = projectIndex

      window.dispatchEvent(new CustomEvent('sliderProjectChange', {
        detail: {
          projectIndex: projectIndex,
          projectId: this.projects[projectIndex].id,
          isStable: this.isStable
        }
      }))
    }
  }

  updateCurrentProject () {
    // Determine which project is currently most visible based on scroll position
    // Round to nearest integer to get the dominant project
    const dominantIndex = Math.round(this.scrollPosition)
    const totalImages = this.projects.length

    // Normalize the index to be within bounds
    let normalizedIndex = dominantIndex % totalImages
    if (normalizedIndex < 0) {
      normalizedIndex = (totalImages + normalizedIndex) % totalImages
    }

    this.currentProjectIndex = normalizedIndex

    // Emit change event if this is a new project
    this.emitProjectChange(normalizedIndex)
  }

  dispatchSliderSettled () {
    const projectIndex = this.currentProjectIndex
    const project = this.projects[projectIndex]

    window.dispatchEvent(new CustomEvent('sliderSettled', {
      detail: {
        projectIndex,
        projectId: project ? project.id : null
      }
    }))
  }

  createCaseBounds () {
    // Store bounds for each project's case media element
    this.caseBounds = {}

    this.projects.forEach(project => {
      const caseElement = document.querySelector(`#${project.id} .case__media`)
      if (caseElement) {
        this.caseBounds[project.id] = {
          element: caseElement
        }
      }
    })
  }

  getCaseBounds (projectId) {
    const entry = this.caseBounds[projectId]

    if (!entry || !entry.element) {
      // Fallback to approximate dimensions if DOM element is missing
      const fallbackWidth = window.innerWidth * 0.7
      const fallbackHeight = fallbackWidth * (768 / 1366)
      const fallbackLeft = (window.innerWidth - fallbackWidth) / 2

      return {
        left: fallbackLeft,
        top: 0,
        width: fallbackWidth,
        height: fallbackHeight
      }
    }

    const rect = entry.element.getBoundingClientRect()
    const hasRectSize = rect.width > 0 && rect.height > 0

    let width = rect.width
    let height = rect.height

    if (!hasRectSize) {
      width = entry.element.offsetWidth || window.innerWidth * 0.7
      height = entry.element.offsetHeight || width * (768 / 1366)
    } else {
      width = rect.width
      height = rect.height
    }

    if (!height) {
      height = width * (768 / 1366)
    }

    const left = hasRectSize ? rect.left : (window.innerWidth - width) / 2
    const top = hasRectSize ? rect.top : 0

    const safeLeft = Number.isFinite(left) ? left : (window.innerWidth - width) / 2
    const safeTop = Number.isFinite(top) ? top : 0

    return { left: safeLeft, top: safeTop, width, height }
  }

  getSettleThreshold () {
    return this.stableThreshold
  }

  waitForSliderToSettle (targetPosition, { timeout = 900 } = {}) {
    if (this.waitForSettleRaf) {
      cancelAnimationFrame(this.waitForSettleRaf)
      this.waitForSettleRaf = null
    }

    const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
    const startTime = now()

    return new Promise(resolve => {
      const checkStable = () => {
        const distance = Math.abs(this.scrollPosition - targetPosition)
        const settled = distance < this.getSettleThreshold() && this.isStable
        const hasTimedOut = (now() - startTime) >= timeout

        if (settled || hasTimedOut) {
          resolve({ settled, hasTimedOut })
          return
        }

        this.waitForSettleRaf = requestAnimationFrame(checkStable)
      }

      checkStable()
    }).finally(() => {
      if (this.waitForSettleRaf) {
        cancelAnimationFrame(this.waitForSettleRaf)
        this.waitForSettleRaf = null
      }
    })
  }

  resolveTransitionPromise (payload = {}) {
    if (typeof this.transitionCompletionResolver === 'function') {
      try {
        this.transitionCompletionResolver(payload)
      } catch (error) {
        console.error('[ThreeSlider] Error resolving transition promise', error)
      }
    }

    this.transitionCompletionResolver = null
    this.transitionCompletionPromise = null
  }

  async onProjectClick (projectId) {
    if (!projectId) return null

    if (this.transitionCompletionPromise) {
      return this.transitionCompletionPromise
    }

    console.log('Project clicked:', projectId)

    // Find the index of the clicked project
    const clickedProjectIndex = this.projects.findIndex(p => p.id === projectId)
    if (clickedProjectIndex === -1) {
      console.error('Could not find project index for', projectId)
      return null
    }

    this.pendingProjectId = projectId
    this.transitionCompletionPromise = new Promise(resolve => {
      this.transitionCompletionResolver = resolve
    })

    const totalProjects = this.projects.length
    const nearestScrollTarget = this.getNearestScrollPosition(clickedProjectIndex)
    const needsSettle = this.isMoving || !this.isStable || Math.abs(this.scrollPosition - nearestScrollTarget) > 0.001

    if (needsSettle) {
      console.log('Slider is moving, quickly settling to clicked project...')

      this.targetScrollPosition = nearestScrollTarget
      this.isStable = false
      this.isMoving = true
      this.targetScrollIntensity = 0

      const { settled } = await this.waitForSliderToSettle(nearestScrollTarget)

      if (!settled) {
        console.warn('Slider did not fully settle before timeout, forcing alignment')
      }
    }

    this.scrollPosition = nearestScrollTarget
    this.targetScrollPosition = nearestScrollTarget
    this.isStable = true
    this.isMoving = false

    const normalizedIndex = ((clickedProjectIndex % totalProjects) + totalProjects) % totalProjects
    this.stableCurrentIndex = normalizedIndex
    this.stableNextIndex = (normalizedIndex + 1) % totalProjects
    this.currentProjectIndex = normalizedIndex
    this.emitProjectChange(this.currentProjectIndex)

    if (this.plane && this.plane.material && this.plane.material.uniforms) {
      const { uniforms } = this.plane.material
      uniforms.uCurrentTexture.value = this.textures[this.stableCurrentIndex]
      uniforms.uNextTexture.value = this.textures[this.stableNextIndex]
      uniforms.uScrollPosition.value = 0
      uniforms.uTransition.value = 0
    }

    console.log('Slider settled on clicked project')

    if (this.transitionTimeline) {
      this.transitionTimeline.kill()
      this.transitionTimeline = null
    }

    this.transition = 0
    this.isTransitioning = true

    // Get viewport dimensions in Three.js world units
    const fov = this.camera.fov * (Math.PI / 180)
    const viewportHeight = 2 * Math.tan(fov / 2) * this.camera.position.z
    const viewportWidth = viewportHeight * this.camera.aspect

    // Calculate current pixel dimensions from initial plane size and current scale
    // Current world size = initialDimensions.width � scale.x
    // Pixel size = (world size / viewport width) � screen width
    const currentWorldWidth = this.initialPlaneDimensions.width * this.plane.scale.x
    const currentWorldHeight = this.initialPlaneDimensions.height * this.plane.scale.y

    const currentPixelWidth = (currentWorldWidth / viewportWidth) * this.screen.width
    const currentPixelHeight = (currentWorldHeight / viewportHeight) * this.screen.height

    this.transitionStartBounds = {
      left: (this.screen.width - currentPixelWidth) / 2,
      top: (this.screen.height - currentPixelHeight) / 2,
      width: currentPixelWidth,
      height: currentPixelHeight
    }

    // Get target case media bounds
    const caseBounds = this.getCaseBounds(projectId)
    if (!caseBounds) {
      console.error('Could not find case bounds for', projectId)
      this.isTransitioning = false
      this.resolveTransitionPromise({ projectId, cancelled: true })
      this.pendingProjectId = null
      return null
    }

    this.transitionTargetBounds = caseBounds

    // Create GSAP animation
    this.transitionTimeline = GSAP.timeline({
      onComplete: () => {
        this.onTransitionComplete()
      }
    })

    this.transitionTimeline.to(this, {
      transition: 1,
      duration: 1.25,
      ease: 'expo.inOut'
    })

    // Dispatch event so Home page can handle navigation
    window.dispatchEvent(new CustomEvent('sliderTransitionStart', {
      detail: { projectId }
    }))

    return this.transitionCompletionPromise
  }

  onTransitionComplete () {
    console.log('Transition complete')
    // Don't set isTransitioning = false here
    // Let positionOnCaseHeader() do it after positioning is complete

    const completedProjectId = this.pendingProjectId

    window.dispatchEvent(new CustomEvent('sliderTransitionComplete', {
      detail: {
        projectId: completedProjectId
      }
    }))

    this.resolveTransitionPromise({ projectId: completedProjectId })
    this.pendingProjectId = null
  }

  updateTransition () {
    if (!this.isTransitioning || !this.transitionStartBounds || !this.transitionTargetBounds) return

    // Lerp pixel dimensions
    const targetPixelWidth = lerp(this.transitionStartBounds.width, this.transitionTargetBounds.width, this.transition)
    const targetPixelHeight = lerp(this.transitionStartBounds.height, this.transitionTargetBounds.height, this.transition)
    const x = lerp(this.transitionStartBounds.left, this.transitionTargetBounds.left, this.transition)
    const y = lerp(this.transitionStartBounds.top, this.transitionTargetBounds.top, this.transition)

    // Get viewport dimensions in Three.js world units
    const fov = this.camera.fov * (Math.PI / 180)
    const viewportHeight = 2 * Math.tan(fov / 2) * this.camera.position.z
    const viewportWidth = viewportHeight * this.camera.aspect

    // Calculate scale based on target pixel size relative to initial plane size
    // Target world size = (targetPixelWidth / screenWidth) � viewportWidth
    // Scale = target world size / initial plane width
    const targetWorldWidth = (targetPixelWidth / this.screen.width) * viewportWidth
    const targetWorldHeight = (targetPixelHeight / this.screen.height) * viewportHeight

    this.plane.scale.x = targetWorldWidth / this.initialPlaneDimensions.width
    this.plane.scale.y = targetWorldHeight / this.initialPlaneDimensions.height

    // Calculate current world size after scaling
    const currentWorldWidth = this.initialPlaneDimensions.width * this.plane.scale.x
    const currentWorldHeight = this.initialPlaneDimensions.height * this.plane.scale.y

    // Position calculation (OGL formula):
    // plane.position.x = -(viewport.width / 2) + (current world width / 2) + (x / screen.width) * viewport.width
    this.plane.position.x = -(viewportWidth / 2) + (currentWorldWidth / 2) + (x / this.screen.width) * viewportWidth
    this.plane.position.y = (viewportHeight / 2) - (currentWorldHeight / 2) - (y / this.screen.height) * viewportHeight

    // Update transition uniform to fade distortion
    this.plane.material.uniforms.uTransition.value = this.transition
  }

  onScroll (delta) {
    // Disable scroll during transition or when locked (on case page)
    if (this.isTransitioning || this.scrollLocked) return

    const wasMoving = this.isMoving

    this.isStable = false

    this.targetScrollIntensity += delta * 0.001
    this.targetScrollIntensity = Math.max(
      -this.maxScrollIntensity,
      Math.min(this.maxScrollIntensity, this.targetScrollIntensity)
    )

    this.targetScrollPosition += delta * 0.001

    this.isMoving = true

    if (!wasMoving) {
      window.dispatchEvent(new CustomEvent('sliderScrollStart', {
        detail: {
          direction: Math.sign(delta),
          currentIndex: this.currentProjectIndex
        }
      }))
    }
  }

  onResize () {
    const previousBaseScale = this.homeBaseScale

    this.isMobile = Detection.isMobile()
    this.setSmoothingValues()
    this.homeBaseScale = this.isMobile ? 0.6 : 0.35

    this.screen.width = window.innerWidth
    this.screen.height = window.innerHeight

    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    if (this.plane) {
      const newDimensions = this.calculatePlaneDimensions()
      this.plane.geometry.dispose()
      this.plane.geometry = new THREE.PlaneGeometry(
        newDimensions.width,
        newDimensions.height,
        32,
        32
      )
    }

    if (!this.isTransitioning && !this.scrollLocked && previousBaseScale !== this.homeBaseScale) {
      const scaleRatio = this.homeBaseScale / previousBaseScale
      this.plane.scale.x *= scaleRatio
      this.plane.scale.y *= scaleRatio
    }
  }

  update () {
    const wasStable = this.isStable

    // Update transition if active
    if (this.isTransitioning) {
      this.updateTransition()
    } else {
      // Normal scroll behavior
      this.scrollIntensity = lerp(
        this.scrollIntensity,
        this.targetScrollIntensity,
        this.scrollSmoothness
      )
      this.plane.material.uniforms.uScrollIntensity.value = this.scrollIntensity

      const positionLerp = this.isMoving ? this.scrollPositionSmoothness : this.settleSmoothness

      this.scrollPosition = lerp(
        this.scrollPosition,
        this.targetScrollPosition,
        positionLerp
      )

      let normalizedPosition = this.scrollPosition % 1
      if (normalizedPosition < 0) normalizedPosition += 1

      if (this.isStable) {
        this.plane.material.uniforms.uScrollPosition.value = 0
      } else {
        this.plane.material.uniforms.uScrollPosition.value = normalizedPosition
      }

      this.updateTextureIndices()

      // Update current project continuously during scroll for text sync
      if (!this.scrollLocked) {
        this.updateCurrentProject()
      }

      if (this.scrollLocked) {
        this.plane.material.uniforms.uScrollPosition.value = 0
        if (this.lockedScale) {
          this.plane.scale.set(this.lockedScale.x, this.lockedScale.y, 1)
        }
      } else {
        // Scale effect based on scroll intensity
        const baseScale = this.homeBaseScale
        const scaleIntensity = 0.1

        if (this.scrollIntensity > 0) {
          const scale = baseScale + this.scrollIntensity * scaleIntensity
          this.plane.scale.set(scale, scale, 1)
        } else {
          const scale = baseScale - Math.abs(this.scrollIntensity) * scaleIntensity
          this.plane.scale.set(scale, scale, 1)
        }
      }

      this.targetScrollIntensity *= this.scrollDamping

      const intensityMagnitude = Math.abs(this.targetScrollIntensity)

      if (intensityMagnitude < this.scrollStopEpsilon) {
        if (this.isMoving) {
          this.isMoving = false
        }

        this.targetScrollIntensity = 0

        const nearestTarget = Math.round(this.scrollPosition)
        if (Math.abs(this.targetScrollPosition - nearestTarget) > 0.0001) {
          this.targetScrollPosition = nearestTarget
        }
      }

      const scrollDelta = Math.abs(this.targetScrollPosition - this.scrollPosition)
      const isWithinThreshold = scrollDelta < this.getSettleThreshold()

      if (isWithinThreshold) {
        if (!this.isStable) {
          const indices = this.determineTextureIndices(this.targetScrollPosition)
          this.stableCurrentIndex = indices.currentIndex
          this.stableNextIndex = indices.nextIndex
        }
        this.isStable = true
      } else if (this.isStable) {
        this.isStable = false
      }
    }

    if (!wasStable && this.isStable) {
      this.dispatchSliderSettled()
    }

    this.renderer.render(this.scene, this.camera)

    this.animationFrame = window.requestAnimationFrame(this.update)
  }

  show () {
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.opacity = '1'
      this.renderer.domElement.style.visibility = 'visible'
    }
  }

  hide () {
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.opacity = '0'
      this.renderer.domElement.style.visibility = 'hidden'
    }
  }

  positionOnCaseHeader (caseId) {
    // Find the case media element
    const caseMedia = document.querySelector(`#${caseId} .case__media`)
    if (!caseMedia) {
      console.error('Could not find case media element for', caseId)
      return
    }

    // Get its bounds
    const bounds = caseMedia.getBoundingClientRect()

    console.log('=== positionOnCaseHeader DEBUG ===')
    console.log('Case ID:', caseId)
    console.log('Bounds:', bounds)
    console.log('Screen:', this.screen)

    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.position = 'fixed'
      this.renderer.domElement.style.top = '0'
      this.renderer.domElement.style.left = '0'
      this.renderer.domElement.style.width = '100vw'
      this.renderer.domElement.style.height = '100vh'
      this.renderer.domElement.style.zIndex = '1000'
      this.renderer.domElement.style.willChange = 'auto'
      this.renderer.domElement.style.overflow = 'visible'
    }

    // Get viewport dimensions
    const fov = this.camera.fov * (Math.PI / 180)
    const viewportHeight = 2 * Math.tan(fov / 2) * this.camera.position.z
    const viewportWidth = viewportHeight * this.camera.aspect

    // Calculate scale to match case media size
    const targetWorldWidth = (bounds.width / this.screen.width) * viewportWidth
    const targetWorldHeight = (bounds.height / this.screen.height) * viewportHeight

    const targetScaleX = targetWorldWidth / this.initialPlaneDimensions.width
    const targetScaleY = targetWorldHeight / this.initialPlaneDimensions.height

    console.log('Target plane scale:', targetScaleX, targetScaleY)

    // Calculate final plane position to align with case media bounds inside the viewport
    const targetPosX = -(viewportWidth / 2) + (targetWorldWidth / 2) + (bounds.left / this.screen.width) * viewportWidth
    const targetPosY = (viewportHeight / 2) - (targetWorldHeight / 2) - (bounds.top / this.screen.height) * viewportHeight

    console.log('Target plane position:', targetPosX, targetPosY)
    console.log('Viewport:', viewportWidth, viewportHeight)

    // Smoothly align plane to the case media
    GSAP.killTweensOf(this.plane.scale)
    GSAP.killTweensOf(this.plane.position)

    const alignDuration = 0.9

    this.lockedScale = null

    GSAP.to(this.plane.scale, {
      x: targetScaleX,
      y: targetScaleY,
      duration: alignDuration,
      ease: 'power2.out',
      onUpdate: () => {
        // Keep Z scale steady to avoid distortion
        this.plane.scale.z = 1
      },
      onComplete: () => {
        this.lockedScale = {
          x: targetScaleX,
          y: targetScaleY
        }
      }
    })

    GSAP.to(this.plane.position, {
      x: targetPosX,
      y: targetPosY,
      duration: alignDuration,
      ease: 'power2.out'
    })

    // Disable scroll mode - plane should stay static
    this.isTransitioning = false
    this.scrollLocked = true
  }

  fadeOut (duration = 600, onComplete) {
    if (!this.renderer || !this.renderer.domElement) return null

    const tween = GSAP.to(this.renderer.domElement, {
      opacity: 0,
      duration: duration / 1000,
      ease: 'power2.out',
      onComplete: () => {
        // After fade completes, truly hide it
        if (this.renderer && this.renderer.domElement) {
          this.renderer.domElement.style.visibility = 'hidden'
        }
        this.scrollLocked = false
        this.lockedScale = null

        if (typeof onComplete === 'function') {
          onComplete()
        }
      }
    })

    return tween
  }

  enableScrollMode () {
    this.scrollLocked = false
    this.lockedScale = null
  }

  disableScrollMode () {
    this.scrollLocked = true
  }

  resetToHomeState () {
    if (this.transitionCompletionPromise) {
      this.resolveTransitionPromise({ projectId: this.pendingProjectId, cancelled: true })
    }
    this.pendingProjectId = null

    // Reset plane to base scale
    this.plane.scale.set(this.homeBaseScale, this.homeBaseScale, 1)

    // Reset plane to center position
    this.plane.position.set(0, 0, 0)

    // Reset transition state
    this.isTransitioning = false
    this.scrollLocked = false
    this.transition = 0
    this.transitionStartBounds = null
    this.transitionTargetBounds = null
    this.lockedScale = null

    // Ensure scroll uniforms are reset
    this.plane.material.uniforms.uTransition.value = 0

    // Reset scroll animation state
    this.scrollIntensity = 0
    this.targetScrollIntensity = 0
    this.scrollPosition = 0
    this.targetScrollPosition = 0
    this.isMoving = false
    this.isStable = false

    this.currentProjectIndex = 0
    this.stableCurrentIndex = 0
    this.stableNextIndex = 1
    this.lastEmittedProjectIndex = -1

    // Make sure it's visible and enabled for scrolling
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.position = 'fixed' // Reset to fixed positioning
      this.renderer.domElement.style.top = '0' // Reset top to 0
      this.renderer.domElement.style.left = '0' // Reset left to 0
      this.renderer.domElement.style.width = '100vw' // Reset to full width
      this.renderer.domElement.style.height = '100vh' // Reset to full height
      this.renderer.domElement.style.willChange = 'auto' // Reset will-change
      this.renderer.domElement.style.overflow = 'visible' // Reset overflow
      this.renderer.domElement.style.opacity = '1'
      this.renderer.domElement.style.visibility = 'visible'
      this.renderer.domElement.style.zIndex = '3' // Reset to original z-index
    }
  }

  destroy () {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame)
    }

    if (this.plane) {
      this.plane.geometry.dispose()
      this.plane.material.dispose()
      this.scene.remove(this.plane)
    }

    if (this.textures) {
      this.textures.forEach(texture => texture.dispose())
    }

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }

    if (this.renderer) {
      this.renderer.dispose()
    }
  }
}



