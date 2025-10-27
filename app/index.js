import 'utils/polyfill'
import 'utils/scroll'
import 'utils/sw'

import AutoBind from 'auto-bind'
import Stats from 'stats.js'
import GSAP from 'gsap'

import each from 'lodash/each'

import Detection from 'classes/Detection'
import LazyLoad from 'utils/lazyLoad'

import Intro from 'pages/Intro'
import About from 'pages/About'
import Case from 'pages/Case'
import Home from 'pages/Home'

// Lazy load Three.js slider to reduce initial bundle size
// This loads ~600KB of Three.js code only when needed
const loadThreeSlider = () => import(/* webpackChunkName: "three-slider" */ 'components/ThreeSlider')
const loadShaderBackground = () => import(/* webpackChunkName: "shader-background" */ 'components/ShaderBackground')

import Navigation from 'components/Navigation'

class App {
  constructor () {
    if (IS_DEVELOPMENT && window.location.search.indexOf('fps') > -1) {
      this.createStats()
    }

    this.url = window.location.pathname

    this.mouse = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    }

    // Track visibility and animation state
    this.isPageVisible = true
    this.isAnimating = false
    this.lastScrollPosition = 0
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    this.isScrollLocked = false
    this.previousScrollLockStyles = null

    AutoBind(this)

    this.createGlobalOverlay()
    this.createNavigation()
    this.createCase()
    this.createHome()
    this.createAbout()
    this.createIntro()
    this.createLazyLoad()

    // Initialize heavy 3D components asynchronously after initial page load
    this.initializeHeavyComponents()

    this.pages = {

      '/': this.intro,
      '/home': this.home,
      '/about': this.about,
      '/case': this.case
    }

    if (this.url.indexOf('/case') > -1) {
      this.page = this.case
      this.page.onResize()
    } else {
      this.page = this.pages[this.url]
    }

    this.page.show(this.url)

    this.addEventListeners()
    this.addLinksEventsListeners()

    this.onResize()

    // Start the update loop immediately
    this.onInteract()
  }

  createLazyLoad () {
    this.lazyLoad = new LazyLoad()
    this.lazyLoad.init()
  }

  async initializeHeavyComponents () {
    // Load heavy 3D components in parallel for better performance
    // This reduces initial bundle size by ~600KB
    await Promise.all([
      this.createSlider(),
      this.createShaderBackground()
    ])

    console.log('Heavy 3D components loaded')
  }

  createGlobalOverlay () {
    this.globalOverlay = {
      element: document.querySelector('.global-overlay'),
      overlayTop: document.querySelector('.global-overlay__row--top'),
      overlayBottom: document.querySelector('.global-overlay__row--bottom')
    }
    
    console.log('Global overlay elements:', this.globalOverlay);
    
    if (!this.globalOverlay.element) {
      console.error('Global overlay element not found!');
    }
  }

  startGlobalCoverTransition () {
    if (!this.globalOverlay.overlayTop || !this.globalOverlay.overlayBottom) {
      console.error('Global overlay elements not found, skipping transition');
      return Promise.resolve();
    }

    const tl = GSAP.timeline()

    // Scale overlay rows to cover screen
    tl.to([this.globalOverlay.overlayTop, this.globalOverlay.overlayBottom], {
      duration: 0.6,
      ease: 'power2.inOut',
      scaleY: 1
    })
    // Keep covered briefly
    .to({}, { duration: 0.1 })

    return new Promise(resolve => {
      tl.eventCallback('onComplete', resolve)
    })
  }

  finishGlobalCoverTransition () {
    if (!this.globalOverlay.overlayTop || !this.globalOverlay.overlayBottom) {
      console.error('Global overlay elements not found, skipping transition');
      return Promise.resolve();
    }

    const tl = GSAP.timeline()
    
    // Keep covered briefly, then reveal
    tl.to({}, { duration: 0.1 })
    .to([this.globalOverlay.overlayTop, this.globalOverlay.overlayBottom], {
      duration: 0.8,
      ease: 'power2.inOut',
      scaleY: 0
    })

    return new Promise(resolve => {
      tl.eventCallback('onComplete', resolve)
    })
  }

  lockScroll () {
    if (this.isScrollLocked) return

    this.isScrollLocked = true

    const content = document.querySelector('.content')

    this.previousScrollLockStyles = {
      body: {
        overflow: document.body.style.overflow,
        pointerEvents: document.body.style.pointerEvents
      },
      html: {
        overflow: document.documentElement.style.overflow
      },
      content: content
        ? {
            overflow: content.style.overflow,
            pointerEvents: content.style.pointerEvents
          }
        : null
    }

    document.body.style.overflow = 'hidden'
    document.body.style.pointerEvents = 'none'
    document.documentElement.style.overflow = 'hidden'

    if (content) {
      content.style.overflow = 'hidden'
      content.style.pointerEvents = 'none'
    }
  }

  unlockScroll () {
    if (!this.isScrollLocked) return

    this.isScrollLocked = false

    const content = document.querySelector('.content')

    if (this.previousScrollLockStyles) {
      document.body.style.overflow = this.previousScrollLockStyles.body.overflow || ''
      document.body.style.pointerEvents = this.previousScrollLockStyles.body.pointerEvents || ''
      document.documentElement.style.overflow = this.previousScrollLockStyles.html.overflow || ''

      if (content && this.previousScrollLockStyles.content) {
        content.style.overflow = this.previousScrollLockStyles.content.overflow || ''
        content.style.pointerEvents = this.previousScrollLockStyles.content.pointerEvents || ''
      } else if (content) {
        content.style.overflow = ''
        content.style.pointerEvents = ''
      }
    } else {
      document.body.style.overflow = ''
      document.body.style.pointerEvents = ''
      document.documentElement.style.overflow = ''

      if (content) {
        content.style.overflow = ''
        content.style.pointerEvents = ''
      }
    }

    this.previousScrollLockStyles = null
  }

  createNavigation () {
    this.navigation = new Navigation({
      url: this.url
    })
  }

  async createSlider () {
    // Query all home project items
    const homeItems = document.querySelectorAll('.home__item')

    if (homeItems.length === 0) {
      console.warn('No .home__item elements found, slider not created')
      return
    }

    // Build projects data array
    const projectsData = []
    homeItems.forEach((item, index) => {
      const link = item.querySelector('.home__link')
      if (link) {
        const id = link.href.replace(`${window.location.origin}/case/`, '')
        projectsData.push({
          element: item,
          id: id,
          index: index
        })
      }
    })

    // Get home list element
    const homeList = document.querySelector('.home__list')

    // Lazy load ThreeSlider module
    try {
      const { default: ThreeSlider } = await loadThreeSlider()

      // Create slider
      this.slider = new ThreeSlider({
        projects: projectsData,
        homeList: homeList
      })

      console.log('ThreeSlider created at App level with', projectsData.length, 'projects')
    } catch (error) {
      console.error('Failed to load ThreeSlider:', error)
    }
  }

  async createShaderBackground () {
    // Lazy load ShaderBackground module
    try {
      const { default: ShaderBackground } = await loadShaderBackground()
      this.shaderBackground = new ShaderBackground()
    } catch (error) {
      console.error('Failed to load ShaderBackground:', error)
      // Fallback to solid color background
      const canvasBackground = document.querySelector('.canvas__background')
      if (canvasBackground) {
        canvasBackground.style.background = '#f8f8f8'
      }
    }
  }

  createStats () {
    this.stats = new Stats()

    document.body.appendChild(this.stats.dom)
  }

  createIntro () {
    this.intro = new Intro()

    // Set up callback for when intro animation completes
    this.intro.onAnimationComplete = () => {
      // Navigate to home page when the split animation completes
      this.onChange({
        url: '/home',
        push: true
      })
    }
  }

  createAbout () {
    this.about = new About()
  }

  createHome () {
    this.home = new Home({ slider: this.slider })
  }

  createCase () {
    this.case = new Case({ slider: this.slider })
  }



  
  /**
   * Change.
   */
  async onChange ({ push = !IS_DEVELOPMENT, url = null }) {
    url = url.replace(window.location.origin, '')

    if (this.isFetching || this.url === url) return

    this.isFetching = true

    const previousUrl = this.url
    this.url = url

    // Special intro-to-home transition (no global overlay needed - intro animation handles the split)
    if (previousUrl === '/' && this.url === '/home') {
      // Don't hide intro - it stays visible during the split
      // Just update the URL and switch pages
      if (push) {
        window.history.pushState({}, document.title, url)
      }

      this.navigation.onChange(this.url)
      this.page = this.pages[this.url]

      // Show homepage - it will be revealed by the intro split animation
      await this.page.show(this.url)

      // After home page is shown, hide the intro (the split layers are already off-screen)
      await this.intro.hide(this.url)
    } else {
      // Normal transition for other pages
      await this.page.hide(this.url)

      if (push) {
        window.history.pushState({}, document.title, url)
      }

      this.navigation.onChange(this.url)

      if (this.url.indexOf('/case') > -1) {
        this.page = this.case
      } else {
        this.page = this.pages[this.url]
      }

      await this.page.show(this.url)
    }

    // Update lazy load for new page content
    if (this.lazyLoad) {
      this.lazyLoad.update()
    }

    this.isFetching = false
  }

  /**
   * Loop.
   */
  update () {
    // Pause rendering when page is hidden
    if (!this.isPageVisible) {
      this.animationFrame = window.requestAnimationFrame(this.update)
      return
    }

    if (this.stats) {
      this.stats.begin()
    }

    // Check if scroll position changed (for conditional canvas updates)
    const currentScroll = this.case.scroll ? this.case.scroll.current : 0
    const scrollChanged = Math.abs(currentScroll - this.lastScrollPosition) > 0.1

    if (this.page) {
      this.page.update()
    }

    if (this.stats) {
      this.stats.end()
    }

    this.animationFrame = window.requestAnimationFrame(this.update)
  }

  /**
   * Events.
   */
  onContextMenu (event) {
    event.preventDefault()
    event.stopPropagation()

    return false
  }

  onPopState () {
    this.onChange({
      url: window.location.pathname,
      push: false
    })
  }

  onResize () {
    if (this.about) {
      this.about.onResize()
    }

    if (this.home) {
      this.home.onResize()
    }

    if (this.case) {
      this.case.onResize()
    }
  }

  onTouchDown (event) {
    event.stopPropagation()

    if (this.isScrollLocked) return

    if (!Detection.isMobile() && event.target.tagName === 'A') return

    this.mouse.x = event.touches ? event.touches[0].clientX : event.clientX
    this.mouse.y = event.touches ? event.touches[0].clientY : event.clientY

    if (this.page && this.page.onTouchDown) {
      this.page.onTouchDown(event)
    }
  }

  onTouchMove (event) {
    event.stopPropagation()

    if (this.isScrollLocked) return

    this.mouse.x = event.touches ? event.touches[0].clientX : event.clientX
    this.mouse.y = event.touches ? event.touches[0].clientY : event.clientY

    if (this.page && this.page.onTouchMove) {
      this.page.onTouchMove(event)
    }
  }

  onTouchUp (event) {
    event.stopPropagation()

    if (this.isScrollLocked) return

    this.mouse.x = event.changedTouches ? event.changedTouches[0].clientX : event.clientX
    this.mouse.y = event.changedTouches ? event.changedTouches[0].clientY : event.clientY

    if (this.page && this.page.onTouchUp) {
      this.page.onTouchUp(event)
    }
  }

  onWheel (event) {
    if (this.isScrollLocked) return

    if (this.page && this.page.onWheel) {
      this.page.onWheel(event)
    }
  }

  onInteract () {
    window.removeEventListener('mousemove', this.onInteract)
    window.removeEventListener('touchstart', this.onInteract)

    this.update()
  }

  onVisibilityChange () {
    this.isPageVisible = !document.hidden

    if (!this.isPageVisible) {
      // Page is hidden, pause expensive operations
      console.log('Page hidden, pausing rendering')
    } else {
      // Page is visible again, resume
      console.log('Page visible, resuming rendering')
    }
  }

  onRequestNavigation (event) {
    const { url } = event.detail

    this.onChange({
      url,
      push: true
    })
  }

  /**
   * Listeners.
   */
  addEventListeners () {
    window.addEventListener('mousemove', this.onInteract, { passive: true })
    window.addEventListener('touchstart', this.onInteract, { passive: true })

    window.addEventListener('popstate', this.onPopState, { passive: true })
    window.addEventListener('resize', this.onResize, { passive: true })

    window.addEventListener('mousedown', this.onTouchDown, { passive: true })
    window.addEventListener('mousemove', this.onTouchMove, { passive: true })
    window.addEventListener('mouseup', this.onTouchUp, { passive: true })

    window.addEventListener('touchstart', this.onTouchDown, { passive: true })
    window.addEventListener('touchmove', this.onTouchMove, { passive: true })
    window.addEventListener('touchend', this.onTouchUp, { passive: true })

    window.addEventListener('mousewheel', this.onWheel, { passive: true })
    window.addEventListener('wheel', this.onWheel, { passive: true })

    // Page Visibility API for pausing when hidden
    document.addEventListener('visibilitychange', this.onVisibilityChange, { passive: true })

    window.addEventListener('lockScroll', this.lockScroll, { passive: true })
    window.addEventListener('unlockScroll', this.unlockScroll, { passive: true })

    // Listen for navigation requests from slider transitions
    window.addEventListener('requestNavigation', this.onRequestNavigation, { passive: true })

    window.oncontextmenu = this.onContextMenu
  }

  addLinksEventsListeners () {
    const links = document.querySelectorAll('a')

    each(links, link => {
      const isLocal = link.href.indexOf(window.location.origin) > -1
      const isSliderLink = link.classList && link.classList.contains('home__link')

      if (isSliderLink) {
        link.onclick = null
        return
      }

      if (isLocal && !link.classList.contains('case__back')) {
        link.onclick = event => {
          event.preventDefault()

          this.onChange({
            url: link.href
          })
        }
      } else if (link.href.indexOf('mailto') === -1 && link.href.indexOf('tel') === -1) {
        link.rel = 'noopener'
        link.target = '_blank'
      }
    })
  }
}

new App()
