import Page from 'components/Page'
import GSAP from 'gsap'
import { delay } from 'utils/math'
import SplitType from 'split-type'
import Detection from 'classes/Detection'

const CARD_CLIP_OPEN = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
const CARD_CLIP_CLOSED = 'polygon(0% 50%, 100% 50%, 100% 50%, 0% 50%)'

export default class extends Page {
  constructor ({ slider }) {
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
      isScrollable: false
    })

    this.slider = slider
    this.hasTransitionPlayed = false
    this.projectElementsById = {}
    this.clickListenersAttached = false
    this.currentProjectId = null
    this.awaitingSliderNavigation = false
    this.isMobile = Detection.isMobile()
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.onSliderProjectChange = this.onSliderProjectChange.bind(this)
    this.onSliderTransitionStart = this.onSliderTransitionStart.bind(this)
    this.onSliderScrollStart = this.onSliderScrollStart.bind(this)
    this.onSliderSettled = this.onSliderSettled.bind(this)
    this.pendingProjectHideTween = null
    this.pendingProjectHideId = null
    this.cardElement = null
    this.cardRevealTimeline = null
    this.cardCollapseTimeline = null
    this.isCardOpen = false
    this.suppressProjectAnimations = false
    this.create()
  }

  show (url) {
    this.element.classList.add(this.classes.active)
    window.dispatchEvent(new CustomEvent('unlockScroll'))

    const canvasBg = document.querySelector('.canvas__background')
    if (canvasBg) {
      canvasBg.style.background = 'transparent'
      canvasBg.style.removeProperty('background-color')
    }

    this.suppressProjectAnimations = false

    if (this.slider) {
      let returnedProjectId = null

      if (typeof this.slider.consumeReturnedFromCaseProjectId === 'function') {
        returnedProjectId = this.slider.consumeReturnedFromCaseProjectId()
      }

      if (returnedProjectId) {
        this.slider.enableScrollMode()
      } else {
        this.slider.resetToHomeState()
      }
    }

    this.playCardReveal()

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
    this.currentProjectId = null

    this.buildProjectLookup()
    if (!this.clickListenersAttached) {
      this.setupProjectClickListeners()
    }
    this.setupInitialProjectStates()
    this.initializeActiveProject()

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

    if (this.pendingProjectHideTween) {
      this.pendingProjectHideTween.kill()
      this.pendingProjectHideTween = null
      this.pendingProjectHideId = null
    }

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

    await this.playCardCollapse({ waitForCompletion: true, skipIfCollapsed: true })

    // Animate text elements out with slide-up
    this.animateTextOutImmediate()

    // Wait for animation to complete before hiding
    await delay(600)
    
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

    // Kill all GSAP animations on this page
    GSAP.killTweensOf(this.elements.items)
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
    this.cardElement = document.querySelector('.home__card')

    this.createList()
    this.splitTextElements()
    this.buildProjectLookup()
    this.setupProjectClickListeners()
    this.setupInitialProjectStates()
    this.initializeActiveProject()

    window.addEventListener('sliderProjectChange', this.onSliderProjectChange)
    window.addEventListener('sliderTransitionStart', this.onSliderTransitionStart)
    window.addEventListener('sliderScrollStart', this.onSliderScrollStart)
    window.addEventListener('sliderSettled', this.onSliderSettled)
  }

  getCardElement () {
    if (!this.cardElement || !document.body.contains(this.cardElement)) {
      this.cardElement = document.querySelector('.home__card')
    }

    return this.cardElement
  }

  playCardReveal () {
    const card = this.getCardElement()
    if (!card) return

    if (this.cardCollapseTimeline) {
      this.cardCollapseTimeline.kill()
      this.cardCollapseTimeline = null
    }

    if (this.cardRevealTimeline) {
      this.cardRevealTimeline.kill()
      this.cardRevealTimeline = null
    }

    GSAP.killTweensOf(card)

    if (this.prefersReducedMotion) {
      GSAP.set(card, {
        opacity: 1,
        clipPath: CARD_CLIP_OPEN
      })
      this.isCardOpen = true
      return
    }

    GSAP.set(card, {
      opacity: 0,
      clipPath: CARD_CLIP_CLOSED
    })
    this.isCardOpen = false

    this.cardRevealTimeline = GSAP.timeline({
      onComplete: () => {
        this.cardRevealTimeline = null
        this.isCardOpen = true
      }
    })

    this.cardRevealTimeline
      .to(card, {
        opacity: 1,
        duration: 0.35,
        ease: 'power2.out'
      })
      .to(card, {
        clipPath: CARD_CLIP_OPEN,
        duration: 0.75,
        ease: 'power3.out'
      }, 0)
  }

  playCardCollapse ({ waitForCompletion = false, skipIfCollapsed = false } = {}) {
    const card = this.getCardElement()
    if (!card) return Promise.resolve()

    const isEligibleForSkip = !this.isCardOpen && !this.cardRevealTimeline && !this.cardCollapseTimeline
    if (skipIfCollapsed && isEligibleForSkip) {
      return Promise.resolve()
    }

    if (this.cardRevealTimeline) {
      this.cardRevealTimeline.kill()
      this.cardRevealTimeline = null
    }

    if (this.cardCollapseTimeline) {
      this.cardCollapseTimeline.kill()
      this.cardCollapseTimeline = null
    }

    GSAP.killTweensOf(card)

    if (this.prefersReducedMotion) {
      this.isCardOpen = false
      GSAP.set(card, { clipPath: CARD_CLIP_CLOSED })

      const tween = GSAP.to(card, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.inOut'
      })

      if (waitForCompletion) {
        return new Promise(resolve => {
          tween.eventCallback('onComplete', resolve)
        })
      }

      return Promise.resolve()
    }

    this.isCardOpen = false
    let resolveHandler = null

    this.cardCollapseTimeline = GSAP.timeline()
    this.cardCollapseTimeline.eventCallback('onComplete', () => {
      this.cardCollapseTimeline = null
      if (resolveHandler) {
        resolveHandler()
      }
    })

    this.cardCollapseTimeline
      .to(card, {
        clipPath: CARD_CLIP_CLOSED,
        duration: 0.6,
        ease: 'power3.in'
      })
      .to(card, {
        opacity: 0,
        duration: 0.3,
        ease: 'power1.in'
      }, '-=0.2')

    if (waitForCompletion) {
      return new Promise(resolve => {
        resolveHandler = resolve
      })
    }

    return Promise.resolve()
  }

  createList () {
    const noop = () => {}

    this.list = {
      enable: noop,
      disable: noop,
      onResize: noop,
      onTouchDown: noop,
      onTouchMove: noop,
      onTouchUp: noop,
      onWheel: noop,
      update: noop
    }
  }

  splitTextElements () {
    // Split all project titles into characters
    const titles = document.querySelectorAll('.home__link__title')

    titles.forEach((title) => {
      const preferWordsOnly = this.prefersReducedMotion
      const splitType = preferWordsOnly ? 'words' : 'words,chars'

      const split = new SplitType(title, {
        types: splitType,
        tagName: 'span'
      })

      // Only wrap chars if we're doing character-level splitting
      if (!preferWordsOnly && split.chars) {
        split.chars.forEach((char) => {
          const originalText = char.textContent
          char.innerHTML = `<span>${originalText}</span>`
        })
      }
    })
  }

  getProjectItems () {
    if (!this.elements.items) return []

    if (this.elements.items instanceof window.NodeList) {
      return Array.from(this.elements.items)
    }

    if (Array.isArray(this.elements.items)) {
      return this.elements.items
    }

    return [this.elements.items]
  }

  buildProjectLookup () {
    this.projectElementsById = {}

    const items = this.getProjectItems()

    items.forEach(item => {
      const link = item.querySelector('.home__link')
      if (!link) return

      const projectId = link.href.replace(`${window.location.origin}/case/`, '')
      if (projectId) {
        this.projectElementsById[projectId] = item
        item.dataset.projectId = projectId
      }
    })
  }

  setupProjectClickListeners () {
    const items = this.getProjectItems()

    items.forEach(item => {
      const link = item.querySelector('.home__link')
      if (!link) return

      link.addEventListener('click', async (event) => {
        event.preventDefault()
        event.stopPropagation()

        const projectId = link.href.replace(`${window.location.origin}/case/`, '')

        if (!this.slider || this.awaitingSliderNavigation) {
          return
        }

        this.awaitingSliderNavigation = true

        try {
          await this.playCardCollapse({
            waitForCompletion: true,
            skipIfCollapsed: false
          })

          const transitionPromise = this.slider.onProjectClick(projectId)

          if (!transitionPromise || typeof transitionPromise.then !== 'function') {
            this.playCardReveal()
            return
          }

          const result = await transitionPromise

          if (!result || result.cancelled) {
            this.playCardReveal()
            return
          }

          const resolvedProjectId = result.projectId || projectId

          window.dispatchEvent(new CustomEvent('requestNavigation', {
            detail: { url: `/case/${resolvedProjectId}` }
          }))
        } catch (error) {
          console.error('[Home] Error awaiting slider transition', error)
          this.playCardReveal()
        } finally {
          this.awaitingSliderNavigation = false
        }
      })
    })

    this.clickListenersAttached = true
  }

  initializeActiveProject () {
    let initialProjectId = null

    if (this.slider && Array.isArray(this.slider.projects) && this.slider.projects.length > 0) {
      const currentIndex = this.slider.currentProjectIndex || 0
      const currentProject = this.slider.projects[currentIndex]
      initialProjectId = currentProject ? currentProject.id : null
    }

    if (!initialProjectId) {
      const items = this.getProjectItems()

      if (items.length > 0) {
        const link = items[0].querySelector('.home__link')
        if (link) {
          initialProjectId = link.href.replace(`${window.location.origin}/case/`, '')
        }
      }
    }

    if (initialProjectId) {
      this.activateProject(initialProjectId, { immediate: true })
      this.changeBackgroundColor(initialProjectId)
    }
  }

  activateProject (projectId, { immediate = false } = {}) {
    if (!projectId || !this.projectElementsById[projectId]) return

    if (this.currentProjectId === projectId && !immediate) return

    if (this.pendingProjectHideTween && this.pendingProjectHideId === projectId) {
      this.pendingProjectHideTween.kill()
      this.pendingProjectHideTween = null
      this.pendingProjectHideId = null
    }

    const newProject = this.projectElementsById[projectId]
    const previousProject = this.currentProjectId ? this.projectElementsById[this.currentProjectId] : null

    if (previousProject && previousProject !== newProject) {
      previousProject.classList.remove('home__item--active')

      if (immediate) {
        this.resetProjectToHiddenState(previousProject)
      } else {
        this.animateProjectOut(previousProject, true)
      }
    }

    newProject.classList.add('home__item--active')

    if (this.suppressProjectAnimations) {
      this.resetProjectToHiddenState(newProject, { preserveActiveClass: true })
    } else if (immediate) {
      this.showProjectImmediately(newProject)
    } else {
      this.animateProjectIn(newProject)
    }

    this.currentProjectId = projectId
  }

  showProjectImmediately (project) {
    const descriptionElements = project.querySelectorAll('.home__link__description')
    const metaElements = project.querySelectorAll('.home__link__meta')

    const useWordsOnly = this.prefersReducedMotion
    const titleSelector = useWordsOnly ? '.home__link__title .word' : '.home__link__title .char span'
    const titleElements = project.querySelectorAll(titleSelector)

    const resolvedTitleElements = (titleElements.length === 0 && !useWordsOnly)
      ? project.querySelectorAll('.home__link__title .word')
      : titleElements

    const killTargets = [
      ...descriptionElements,
      ...resolvedTitleElements,
      ...metaElements
    ]

    GSAP.killTweensOf(killTargets)

    GSAP.set(descriptionElements, {
      y: '0%',
      opacity: 1
    })

    GSAP.set(resolvedTitleElements, {
      y: '0%'
    })

    GSAP.set(metaElements, {
      opacity: 1,
      y: '0%'
    })
  }

  resetProjectToHiddenState (project, { preserveActiveClass = false } = {}) {
    if (!project) return

    const descriptionElements = project.querySelectorAll('.home__link__description')
    const metaElements = project.querySelectorAll('.home__link__meta')

    const useWordsOnly = this.prefersReducedMotion
    const titleSelector = useWordsOnly ? '.home__link__title .word' : '.home__link__title .char span'
    const titleElements = project.querySelectorAll(titleSelector)

    const resolvedTitleElements = (titleElements.length === 0 && !useWordsOnly)
      ? project.querySelectorAll('.home__link__title .word')
      : titleElements

    const killTargets = [
      ...descriptionElements,
      ...resolvedTitleElements,
      ...metaElements
    ]

    GSAP.killTweensOf(killTargets)

    GSAP.set(descriptionElements, {
      y: '100%',
      opacity: 0
    })

    GSAP.set(resolvedTitleElements, {
      y: '100%'
    })

    metaElements.forEach(meta => {
      const isBottom = meta.classList.contains('home__link__meta--bottom-left') || meta.classList.contains('home__link__meta--bottom-right')
      const offset = isBottom ? '30%' : '-30%'
      GSAP.set(meta, {
        opacity: 0,
        y: offset
      })
    })

    if (!preserveActiveClass) {
      project.classList.remove('home__item--active')
    }
  }

  setupInitialProjectStates () {
    const items = this.getProjectItems()

    items.forEach(project => {
      this.resetProjectToHiddenState(project)
    })
  }

  animateProjectIn (project) {
    const descriptionElements = project.querySelectorAll('.home__link__description')
    const metaElements = project.querySelectorAll('.home__link__meta')

    const useWordsOnly = this.prefersReducedMotion
    const titleSelector = useWordsOnly ? '.home__link__title .word' : '.home__link__title .char span'
    const titleElements = project.querySelectorAll(titleSelector)

    const resolvedTitleElements = (titleElements.length === 0 && !useWordsOnly)
      ? project.querySelectorAll('.home__link__title .word')
      : titleElements

    GSAP.killTweensOf(descriptionElements)
    GSAP.killTweensOf(resolvedTitleElements)
    GSAP.killTweensOf(metaElements)

    if (this.prefersReducedMotion) {
      GSAP.set(descriptionElements, { y: '0%', opacity: 1 })
      GSAP.set(resolvedTitleElements, { y: '0%' })
      GSAP.set(metaElements, { opacity: 1, y: '0%' })
      return
    }

    const titleDuration = this.isMobile ? 0.6 : 0.75
    const titleStagger = this.isMobile ? 0.03 : 0.05
    const titleDelay = this.isMobile ? 0.1 : 0.2

    if (resolvedTitleElements.length > 0) {
      GSAP.fromTo(resolvedTitleElements, {
        y: '100%'
      }, {
        y: '0%',
        duration: titleDuration,
        ease: 'power3.out',
        stagger: titleStagger,
        delay: titleDelay,
        force3D: true
      })
    }

    const descriptionDuration = this.isMobile ? 0.5 : 0.7

    GSAP.fromTo(descriptionElements, {
      y: '100%',
      opacity: 0
    }, {
      y: '0%',
      opacity: 1,
      duration: descriptionDuration,
      ease: 'power3.out',
      delay: titleDelay + (this.isMobile ? 0.05 : 0.1),
      force3D: true,
      transformOrigin: 'center center'
    })

    if (metaElements.length > 0) {
      metaElements.forEach(meta => {
        const isBottom = meta.classList.contains('home__link__meta--bottom-left') || meta.classList.contains('home__link__meta--bottom-right')
        const fromY = isBottom ? '30%' : '-30%'

        GSAP.fromTo(meta, {
          y: fromY,
          opacity: 0
        }, {
          y: '0%',
          opacity: 1,
          duration: this.isMobile ? 0.45 : 0.55,
          ease: 'power3.out',
          delay: titleDelay + (this.isMobile ? 0.1 : 0.15)
        })
      })
    }
  }

  animateProjectOut (project, immediate = false) {
    const descriptionElements = project.querySelectorAll('.home__link__description')
    const metaElements = project.querySelectorAll('.home__link__meta')

    const useWordsOnly = this.prefersReducedMotion
    const titleSelector = useWordsOnly ? '.home__link__title .word' : '.home__link__title .char span'
    const titleElements = project.querySelectorAll(titleSelector)

    const resolvedTitleElements = (titleElements.length === 0 && !useWordsOnly)
      ? project.querySelectorAll('.home__link__title .word')
      : titleElements

    GSAP.killTweensOf(descriptionElements)
    GSAP.killTweensOf(resolvedTitleElements)
    GSAP.killTweensOf(metaElements)

    if (this.prefersReducedMotion) {
      GSAP.set(descriptionElements, { opacity: 0 })
      GSAP.set(resolvedTitleElements, { y: '100%' })
      GSAP.set(metaElements, { opacity: 0 })
      return null
    }

    const outDuration = this.isMobile ? 0.35 : (immediate ? 0.4 : 0.45)
    const outStagger = this.isMobile ? 0.015 : (immediate ? 0.02 : 0.03)

    const tl = GSAP.timeline()

    tl.to(resolvedTitleElements, {
      y: '100%',
      duration: outDuration,
      ease: immediate ? 'power2.in' : 'power3.in',
      stagger: outStagger,
      force3D: true
    }, 0)

    tl.to(descriptionElements, {
      y: '100%',
      opacity: 0,
      duration: outDuration,
      ease: immediate ? 'power2.in' : 'power3.in',
      stagger: outStagger,
      force3D: true,
      transformOrigin: 'center center'
    }, 0)

    if (metaElements.length > 0) {
      metaElements.forEach(meta => {
        const isBottom = meta.classList.contains('home__link__meta--bottom-left') || meta.classList.contains('home__link__meta--bottom-right')
        const toY = isBottom ? '30%' : '-30%'

        tl.to(meta, {
          y: toY,
          opacity: 0,
          duration: outDuration,
          ease: immediate ? 'power2.in' : 'power3.in'
        }, 0)
      })
    }

    return tl
  }

  animateTextOut () {
    // Animate all visible projects out
    const items = this.getProjectItems()

    items.forEach(project => {
      this.resetProjectToHiddenState(project)
    })
  }

  animateTextOutImmediate () {
    // Animate all visible projects out immediately
    const items = this.getProjectItems()

    items.forEach(project => {
      this.resetProjectToHiddenState(project)
    })
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
      // Shader background handles visuals now; keep navigation in sync directly
      this.updateNavigationBackground(targetColor)

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

  updateNavigationBackground(color) {
    const navBgElement = document.querySelector('.navigation__background')
    if (navBgElement) {
      navBgElement.style.setProperty('--nav-bg-color', color)
      navBgElement.style.background = color
    }
  }

  animateActiveProjectOutForTransition () {
    if (!this.currentProjectId) return null

    const project = this.projectElementsById[this.currentProjectId]
    if (!project) return null

    return this.animateProjectOut(project, false)
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

    if (this.slider) {
      const normalized = event.deltaY || event.detail || event.wheelDelta
      this.slider.onScroll(normalized)
    }
  }

  update () {
    super.update()
    this.list.update()
  }

  onSliderProjectChange (event) {
    const { projectId, isStable } = event.detail

    this.changeBackgroundColor(projectId)

    if (!isStable) return
    if (!this.element || !this.element.classList.contains(this.classes.active)) return
    if (this.awaitingSliderNavigation) return
    if (!projectId) return
    if (this.currentProjectId === projectId) return

    this.activateProject(projectId)
  }

  onSliderTransitionStart (event) {
    const detail = event ? (event.detail || {}) : {}
    const { projectId, direction } = detail

    if (direction === 'reverse') {
      return
    }
    console.log('[Home] Slider transition start for:', projectId)

    window.dispatchEvent(new CustomEvent('lockScroll'))

    if (this.list && this.list.disable) {
      this.list.disable()
    }

    this.suppressProjectAnimations = true
    this.animateActiveProjectOutForTransition()

    // Ensure card is collapsed if transition was triggered externally
    this.playCardCollapse({ waitForCompletion: false, skipIfCollapsed: true })

    this.activateProject(projectId)
    this.changeBackgroundColor(projectId)

    console.log('[Home] Slider transition initiated, awaiting completion via promise')
  }

  onSliderScrollStart () {
    if (!this.element || !this.element.classList.contains(this.classes.active)) return
    if (this.awaitingSliderNavigation) return

    if (this.currentProjectId !== null) {
      const currentProjectId = this.currentProjectId
      const currentProject = this.projectElementsById[currentProjectId]

      if (currentProject) {
        if (this.pendingProjectHideTween) {
          this.pendingProjectHideTween.kill()
          this.pendingProjectHideTween = null
          this.pendingProjectHideId = null
        }

        this.animateProjectOut(currentProject)

        const cleanupDelay = this.isMobile ? 0.4 : 0.55
        this.pendingProjectHideId = currentProjectId
        this.pendingProjectHideTween = GSAP.delayedCall(cleanupDelay, () => {
          if (this.currentProjectId !== currentProjectId) {
            this.resetProjectToHiddenState(currentProject)
          }
          this.pendingProjectHideTween = null
          this.pendingProjectHideId = null
        })
      }

      this.currentProjectId = null
    }
  }

  onSliderSettled (event) {
    if (!this.element || !this.element.classList.contains(this.classes.active)) return
    if (this.awaitingSliderNavigation) return

    const { projectId } = event.detail || {}
    if (!projectId) return

    if (this.currentProjectId === projectId) {
      return
    }

    this.suppressProjectAnimations = false
    this.activateProject(projectId)
  }

  destroy () {
    window.removeEventListener('sliderProjectChange', this.onSliderProjectChange)
    window.removeEventListener('sliderTransitionStart', this.onSliderTransitionStart)
    window.removeEventListener('sliderScrollStart', this.onSliderScrollStart)
    window.removeEventListener('sliderSettled', this.onSliderSettled)

    if (this.pendingProjectHideTween) {
      this.pendingProjectHideTween.kill()
      this.pendingProjectHideTween = null
      this.pendingProjectHideId = null
    }

    super.destroy()
  }
}
