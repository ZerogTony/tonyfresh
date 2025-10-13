import Page from 'components/Page'
import Scrolling from 'components/Scrolling'
import GSAP from 'gsap'
import { delay } from 'utils/math'
import SplitType from 'split-type'
import Detection from 'classes/Detection'

export default class extends Page {
  constructor (canvas) {
    super({
      classes: {
        active: 'home--active'
      },
      element: '.home',
      elements: {
        list: '.home__list',
        items: '.home__item',
        overlayTop: '.home__overlay__row--top',
        overlayBottom: '.home__overlay__row--bottom',
        canvasBackground: '.canvas__background'
      },
      isScrollable: true
    })

    this.hasTransitionPlayed = false
    this.animatedProjects = new Set()
    this.canvas = canvas
    this.isMobile = Detection.isMobile()
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.create()
  }

  show (url) {
    this.list.enable()
    this.element.classList.add(this.classes.active)

    // Fade in white card
    const card = document.querySelector('.home__card')
    if (card) {
      GSAP.to(card, {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.inOut'
      })
    }

    // Fade in feathered borders with delay
    const featherTop = document.querySelector('.home__background__top')
    const featherBottom = document.querySelector('.home__background__bottom')
    if (featherTop && featherBottom) {
      GSAP.to([featherTop, featherBottom], {
        opacity: 1,
        duration: 0.6,
        delay: 0.8,
        ease: 'power2.inOut'
      })
    }

    // Reset animation tracking when returning to home
    this.animatedProjects.clear()

    // Re-setup initial states for all projects
    this.setupInitialProjectStates()

    // Animate any currently visible projects immediately, then setup observer for the rest
    this.animateVisibleProjects()

    // Reconnect intersection observer after a brief delay to ensure proper triggering
    this.reconnectObserver()

    return super.show()
  }

  prepareForTransition() {
    // Set overlay to cover screen immediately to prevent flash
    GSAP.set([this.elements.overlayTop, this.elements.overlayBottom], { scaleY: 1 });
  }

  finishCoverTransition() {
    // Keep covered briefly, then reveal
    const tl = GSAP.timeline();

    tl.to({}, { duration: 0.1 })
    .to([this.elements.overlayTop, this.elements.overlayBottom], {
      duration: 0.8,
      ease: 'power2.inOut',
      scaleY: 0
    })
    .call(() => {
      this.hasTransitionPlayed = true;
    });

    return tl;
  }

  async hide (nextUrl) {
    // Dispatch event to lock hover animations
    window.dispatchEvent(new CustomEvent('homeTransitionStart'))

    // Fade out feathered borders immediately (no delay)
    const featherTop = document.querySelector('.home__background__top')
    const featherBottom = document.querySelector('.home__background__bottom')
    if (featherTop && featherBottom) {
      GSAP.to([featherTop, featherBottom], {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.inOut'
      })
    }

    // Fade out white card
    const card = document.querySelector('.home__card')
    if (card) {
      GSAP.to(card, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.inOut'
      })
    }

    // Animate text elements out with slide-up
    this.animateTextOutImmediate()

    // Wait for animation to complete before hiding
    await delay(400)
    
    this.list.disable()
    this.element.classList.remove(this.classes.active)

    // Only reset background and text colors if NOT going to a case page
    const isGoingToCasePage = nextUrl && nextUrl.indexOf('/case') > -1
    
    if (!isGoingToCasePage) {
      // Reset canvas background to default
      if (this.elements.canvasBackground) {
        GSAP.to(this.elements.canvasBackground, {
          backgroundColor: 'rgb(248, 248, 248)',
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }

      // Reset text colors to default
      this.setProjectTextColors('default', '#2c2c2c')
    }

    // Clean up intersection observer
    if (this.observer) {
      this.observer.disconnect()
    }

    // Kill all GSAP animations on this page
    GSAP.killTweensOf(this.elements.items)
    GSAP.killTweensOf('.home__link__number')
    GSAP.killTweensOf('.home__link__title .char span')
    GSAP.killTweensOf('.home__link__title .word')
    GSAP.killTweensOf('.home__link__description')

    await delay(400)

    return super.hide()
  }

  create () {
    super.create()

    // Manually query canvas background since it's outside .home element
    this.canvasBackgroundElement = document.querySelector('.canvas__background')
    console.log('Manually queried canvas background:', this.canvasBackgroundElement)

    this.createList()
    this.splitTextElements()
    this.createIntersectionObserver()
    this.setupInitialProjectStates()
  }

  createList () {
    this.list = new Scrolling({
      element: document.body,
      elements: {
        list: this.elements.list,
        items: this.elements.items
      }
    })
  }

  splitTextElements () {
    // Split all project titles into characters
    const titles = document.querySelectorAll('.home__link__title')

    titles.forEach((title) => {
      // On mobile or reduced motion, split by words for better performance
      // On desktop, split by characters for detailed animation
      const splitType = (this.isMobile || this.prefersReducedMotion) ? 'words' : 'chars'

      const split = new SplitType(title, {
        types: splitType,
        tagName: 'span'
      })

      // Only wrap chars if we're doing character-level splitting
      if (split.chars && splitType === 'chars') {
        split.chars.forEach((char) => {
          const originalText = char.textContent
          char.innerHTML = `<span>${originalText}</span>`
        })
      }
    })
  }

  createIntersectionObserver () {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const projectId = entry.target.dataset.projectId || entry.target.querySelector('.home__link').href.split('/').pop()

        if (entry.isIntersecting) {
          // Change background color based on visible project
          this.changeBackgroundColor(projectId)

          // Always animate in when entering viewport
          this.animateProjectIn(entry.target)
        } else {
          // Animate out when leaving viewport
          this.animateProjectOut(entry.target, false)
        }
      })
    }, {
      threshold: 0.3, // Trigger when 30% of project is visible
      rootMargin: '0px 0px -10% 0px' // Trigger slightly before entering viewport
    })

    // Observe all projects
    this.elements.items.forEach((item, index) => {
      item.dataset.projectId = item.querySelector('.home__link').href.split('/').pop()
      this.observer.observe(item)
    })
  }

  setupInitialProjectStates () {
    // Set all projects to initial hidden state
    this.elements.items.forEach(project => {
      const numberElements = project.querySelectorAll('.home__link__number')
      const descriptionElements = project.querySelectorAll('.home__link__description')

      // Use word or char selector based on split type
      const titleSelector = (this.isMobile || this.prefersReducedMotion)
        ? '.home__link__title .word'
        : '.home__link__title .char span'
      const titleElements = project.querySelectorAll(titleSelector)

      // Set number and description to hidden
      GSAP.set([numberElements, descriptionElements], {
        y: '100%',
        opacity: 0
      })

      // Set title elements to hidden
      GSAP.set(titleElements, {
        y: '100%'
      })

      numberElements.forEach(number => {
        GSAP.set(number, {
          '--underline-scale': 0
        })
      })
    })
  }

  animateProjectIn (project) {
    const numberElements = project.querySelectorAll('.home__link__number')
    const descriptionElements = project.querySelectorAll('.home__link__description')

    // Use word or char selector based on split type
    const titleSelector = (this.isMobile || this.prefersReducedMotion)
      ? '.home__link__title .word'
      : '.home__link__title .char span'
    const titleElements = project.querySelectorAll(titleSelector)

    // Reduced durations and stagger on mobile for better performance
    const duration = this.isMobile ? 0.5 : 0.8
    const stagger = this.isMobile ? 0.02 : 0.05

    // Animate number in first
    GSAP.fromTo(numberElements, {
      y: '100%',
      opacity: 0
    }, {
      y: '0%',
      opacity: 1,
      duration: duration,
      ease: this.isMobile ? 'power2.out' : 'expo.out',
      force3D: true,
      transformOrigin: 'center center'
    })

    // Animate title elements with stagger
    if (titleElements.length > 0) {
      GSAP.fromTo(titleElements, {
        y: '100%'
      }, {
        y: '0%',
        duration: this.isMobile ? 0.5 : 0.75,
        ease: this.isMobile ? 'power2.out' : 'expo.out',
        stagger: stagger,
        delay: this.isMobile ? 0.02 : 0.04,
        force3D: true
      })
    }

    // Animate description last
    GSAP.fromTo(descriptionElements, {
      y: '100%',
      opacity: 0
    }, {
      y: '0%',
      opacity: 1,
      duration: duration,
      ease: this.isMobile ? 'power2.out' : 'expo.out',
      delay: this.isMobile ? 0.04 : 0.08,
      force3D: true,
      transformOrigin: 'center center'
    })

    // Animate underlines in
    numberElements.forEach(number => {
      GSAP.to(number, {
        '--underline-scale': 1,
        duration: this.isMobile ? 0.2 : 0.3,
        delay: this.isMobile ? 0.02 : 0.05,
        ease: 'power2.out'
      })
    })
  }

  animateVisibleProjects () {
    // Find and animate all projects currently visible in the viewport
    this.elements.items.forEach(project => {
      if (this.isProjectInViewport(project)) {
        const projectId = project.querySelector('.home__link').href.split('/').pop()
        
        if (!this.animatedProjects.has(projectId)) {
          this.animateProjectIn(project)
          this.animatedProjects.add(projectId)
        }
      }
    })
  }

  isProjectInViewport (project) {
    const rect = project.getBoundingClientRect()
    const windowHeight = window.innerHeight || document.documentElement.clientHeight
    
    // Consider project visible if any part is in viewport
    return (
      rect.bottom > 0 && 
      rect.top < windowHeight &&
      rect.bottom > windowHeight * 0.1 // At least 10% visible
    )
  }

  reconnectObserver () {
    // Disconnect and reconnect observer to ensure it triggers for all projects
    if (this.observer) {
      this.observer.disconnect()
    }
    
    // Small delay to ensure DOM is ready and animations have started
    setTimeout(() => {
      this.createIntersectionObserver()
    }, 100)
  }

  animateTextOut () {
    // Animate all visible projects out
    this.elements.items.forEach(project => {
      this.animateProjectOut(project, false)
    })
  }

  animateTextOutImmediate () {
    // Animate all visible projects out immediately
    this.elements.items.forEach(project => {
      this.animateProjectOut(project, true)
    })
  }

  animateProjectOut (project, immediate = false) {
    const numberElements = project.querySelectorAll('.home__link__number')
    const descriptionElements = project.querySelectorAll('.home__link__description')

    // Use word or char selector based on split type
    const titleSelector = (this.isMobile || this.prefersReducedMotion)
      ? '.home__link__title .word'
      : '.home__link__title .char span'
    const titleElements = project.querySelectorAll(titleSelector)

    // Reduced durations on mobile
    const duration = this.isMobile ? 0.3 : (immediate ? 0.4 : 0.5)
    const stagger = this.isMobile ? 0.01 : (immediate ? 0.01 : 0.02)

    // Animate underlines out
    numberElements.forEach(number => {
      GSAP.to(number, {
        '--underline-scale': 0,
        duration: this.isMobile ? 0.15 : (immediate ? 0.2 : 0.25),
        ease: 'power2.out'
      })
    })

    // Animate number and description out
    GSAP.to([numberElements, descriptionElements], {
      y: '100%',
      opacity: 0,
      duration: duration,
      ease: this.isMobile ? 'power2.in' : (immediate ? 'power2.in' : 'expo.in'),
      stagger: this.isMobile ? 0.01 : (immediate ? 0.02 : 0.03),
      force3D: true,
      transformOrigin: 'center center'
    })

    // Animate title elements out with stagger
    if (titleElements.length > 0) {
      GSAP.to(titleElements, {
        y: '100%',
        duration: duration,
        ease: this.isMobile ? 'power2.in' : (immediate ? 'power2.in' : 'expo.in'),
        stagger: stagger,
        force3D: true
      })
    }
  }

  changeBackgroundColor (projectId) {
    console.log('changeBackgroundColor called for:', projectId)
    console.log('canvasBackgroundElement:', this.canvasBackgroundElement)

    if (!this.canvasBackgroundElement) {
      console.error('canvasBackground element not found!')
      return
    }

    // Define project colors (hex values for CSS)
    const projectColors = {
      'sazy': '#3e5aa4', // swapped with ocb
      'ffmag': '#83715f',
      'popeyes': '#937284',
      'boxpark': '#fffd3c',
      'spotify': '#eeeeee',
      'stoli': '#ff0042',
      'turning-tide': '#a28a70',
      'idris-elba': '#000000', // black
      'ocb': '#dcd2c8', // swapped with sazy
      'jack-daniels': '#808080', // grey
      'inbound': '#fdcb47'
    }

    // Define text colors for each project
    const projectTextColors = {
      'sazy': '#B8CCFF', // swapped with ocb
      'ffmag': '#D9CEC3',
      'popeyes': '#FFE6E8', // much lighter pink for better contrast on red
      'boxpark': '#2C2C00', // dark olive for better contrast on yellow
      'spotify': '#B3A4A4',
      'stoli': '#ffffff', // fine as is
      'turning-tide': '#ffffff', // fine as is
      'idris-elba': '#ffffff', // fine as is (portenoire)
      'ocb': '#F7F7F7', // swapped with sazy
      'jack-daniels': '#ffffff', // fine as is
      'inbound': '#FFF4C4' // much lighter yellow for better contrast on yellow
    }

    const targetColor = projectColors[projectId]
    console.log('Target color for', projectId, ':', targetColor)

    if (targetColor) {
      console.log('Animating canvas__background div to:', targetColor)

      // Animate the canvas__background div background color
      GSAP.to(this.canvasBackgroundElement, {
        backgroundColor: targetColor,
        duration: 0.5,
        ease: 'power2.inOut',
        onStart: () => console.log('Animation started'),
        onUpdate: () => {
          // Update navigation and beams as the background animates
          this.updateBackgroundGradients()
        },
        onComplete: () => console.log('Animation complete')
      })

      // Animate home card beams to match project color
      const beamTop = document.querySelector('.home__card__beam--top')
      const beamBottom = document.querySelector('.home__card__beam--bottom')

      if (beamTop) {
        GSAP.to(beamTop, {
          backgroundColor: targetColor,
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }

      if (beamBottom) {
        GSAP.to(beamBottom, {
          backgroundColor: targetColor,
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }

      // Update text colors based on project
      const textColor = projectTextColors[projectId]
      if (textColor) {
        this.setProjectTextColors(projectId, textColor)
      }
    } else {
      console.warn('No color defined for project:', projectId)
    }
  }

  setProjectTextColors(projectId, textColor) {
    const duration = 0.5
    const isLightText = textColor === '#ffffff'

    // Navigation elements only (keep home text black)
    GSAP.to('.navigation__link', {
      color: textColor,
      duration: duration,
      ease: 'power2.inOut'
    })

    // Logo invert based on text color
    const logoImg = document.querySelector('.navigation__item:first-child img')
    if (logoImg) {
      GSAP.to(logoImg, {
        filter: isLightText ? 'invert(0)' : 'invert(1)',
        duration: duration,
        ease: 'power2.inOut'
      })
    }

    // Easter egg button - use contrasting color to text
    const easterBtn = document.querySelector('.navigation__easter')
    if (easterBtn) {
      const buttonColor = isLightText ? '#ffffff' : '#2c2c2c'
      GSAP.to(easterBtn, {
        backgroundColor: buttonColor,
        duration: duration,
        ease: 'power2.inOut'
      })
    }
  }

  setLightTextMode(isLight) {
    // Keep this function for backwards compatibility
    this.setProjectTextColors('default', isLight ? '#ffffff' : '#2c2c2c')
  }

  updateBackgroundGradients() {
    if (!this.canvasBackgroundElement) return

    // Get the current canvas__background div color from computed style
    const bgColor = window.getComputedStyle(this.canvasBackgroundElement).backgroundColor

    // Update navigation background to match current canvas__background color
    const navBgElement = document.querySelector('.navigation__background')
    if (navBgElement) {
      navBgElement.style.setProperty('--nav-bg-color', bgColor)
      navBgElement.style.background = bgColor
    }
  }


  onResize () {
    super.onResize()
    this.list.onResize()
  }

  onTouchDown (event) {
    this.list.onTouchDown(event)
  }

  onTouchMove (event) {
    this.list.onTouchMove(event)
  }

  onTouchUp (event) {
    this.list.onTouchUp(event)
  }

  onWheel (event) {
    this.list.onWheel(event)
  }

  update () {
    super.update()
    this.list.update()
  }
}
