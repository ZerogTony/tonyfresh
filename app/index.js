import 'utils/polyfill'
import 'utils/scroll'
import 'utils/sw'

import AutoBind from 'auto-bind'
import Stats from 'stats.js'
import GSAP from 'gsap'

import each from 'lodash/each'

import Detection from 'classes/Detection'

import Intro from 'pages/Intro'
import About from 'pages/About'
import Case from 'pages/Case'
import Home from 'pages/Home'



import Canvas from 'components/Canvas'
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

    AutoBind(this)

  
      this.createCanvas()
    
    this.createGlobalOverlay()
    this.createNavigation()
    this.createCase()
    this.createHome()
    this.createAbout()
    this.createIntro()

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

  createCanvas () {
    this.canvas = new Canvas({
      url: this.url
    })
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

  createNavigation () {
    this.navigation = new Navigation({
      canvas: this.canvas,
      url: this.url
    })
  }

  createStats () {
    this.stats = new Stats()

    document.body.appendChild(this.stats.dom)
  }

  createIntro () {
    this.intro = new Intro()
  }

  createAbout () {
    this.about = new About()
  }

  createHome () {
    this.home = new Home(this.canvas)
  }

  createCase () {
    this.case = new Case(this.canvas)
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

    if (this.canvas) {
      this.canvas.onChange(this.url)
    }

    // Special letterbox transition when going FROM intro TO homepage
    if (previousUrl === '/' && this.url === '/home') {
      // First, reverse all intro animations (intro handles this in its hide method)
      await this.page.hide(this.url)
      
      // Use global overlay for the letterbox transition (stays available between pages)
      if (this.globalOverlay.overlayTop && this.globalOverlay.overlayBottom) {
        // Set letterbox to cover screen (dark grey screen)
        GSAP.set([this.globalOverlay.overlayTop, this.globalOverlay.overlayBottom], { scaleY: 1 })
        
        // Update navigation and set new page behind the letterbox
        if (push) {
          window.history.pushState({}, document.title, url)
        }
        this.navigation.onChange(this.url)
        this.page = this.pages[this.url]
        
        // Show homepage behind the letterbox
        await this.page.show(this.url)
        
        // Then animate letterbox away to reveal homepage
        GSAP.to([this.globalOverlay.overlayTop, this.globalOverlay.overlayBottom], {
          scaleY: 0,
          duration: 0.8,
          ease: 'power2.inOut',
          delay: 0.2
        })
      } else {
        console.error('Global overlay elements not found for transition')
        // Fallback without letterbox
        if (push) {
          window.history.pushState({}, document.title, url)
        }
        this.navigation.onChange(this.url)
        this.page = this.pages[this.url]
        await this.page.show(this.url)
      }
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

    this.isFetching = false
  }

  /**
   * Loop.
   */
  update () {
    if (this.stats) {
      this.stats.begin()
    }

    if (this.page) {
      this.page.update()
    }

    if (this.canvas && this.canvas.update) {
      this.canvas.update(this.case.scroll ? this.case.scroll.current : 0)
    }

    if (this.stats) {
      this.stats.end()
    }

    window.requestAnimationFrame(this.update)
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

    if (this.canvas && this.canvas.onResize) {
      this.canvas.onResize()
    }
  }

  onTouchDown (event) {
    event.stopPropagation()

    if (!Detection.isMobile() && event.target.tagName === 'A') return

    this.mouse.x = event.touches ? event.touches[0].clientX : event.clientX
    this.mouse.y = event.touches ? event.touches[0].clientY : event.clientY

    if (this.page && this.page.onTouchDown) {
      this.page.onTouchDown(event)
    }

    if (this.canvas && this.canvas.onTouchDown) {
      this.canvas.onTouchDown(this.mouse)
    }
  }

  onTouchMove (event) {
    event.stopPropagation()

    this.mouse.x = event.touches ? event.touches[0].clientX : event.clientX
    this.mouse.y = event.touches ? event.touches[0].clientY : event.clientY

    if (this.page && this.page.onTouchMove) {
      this.page.onTouchMove(event)
    }

    if (this.canvas && this.canvas.onTouchMove) {
      this.canvas.onTouchMove(this.mouse)
    }
  }

  onTouchUp (event) {
    event.stopPropagation()

    this.mouse.x = event.changedTouches ? event.changedTouches[0].clientX : event.clientX
    this.mouse.y = event.changedTouches ? event.changedTouches[0].clientY : event.clientY

    if (this.page && this.page.onTouchUp) {
      this.page.onTouchUp(event)
    }

    if (this.canvas && this.canvas.onTouchUp) {
      this.canvas.onTouchUp(this.mouse)
    }
  }

  onWheel (event) {
    if (this.page && this.page.onWheel) {
      this.page.onWheel(event)
    }

    if (this.canvas && this.canvas.onWheel) {
      this.canvas.onWheel(event)
    }
  }

  onInteract () {
    window.removeEventListener('mousemove', this.onInteract)
    window.removeEventListener('touchstart', this.onInteract)

    this.update()
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

    window.oncontextmenu = this.onContextMenu
  }

  addLinksEventsListeners () {
    const links = document.querySelectorAll('a')

    each(links, link => {
      const isLocal = link.href.indexOf(window.location.origin) > -1

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
