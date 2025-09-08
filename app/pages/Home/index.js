import Page from 'components/Page'
import Scrolling from 'components/Scrolling'
import GSAP from 'gsap'
import { delay } from 'utils/math'

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
        overlayBottom: '.home__overlay__row--bottom'
      },
      isScrollable: true
    })

    this.hasTransitionPlayed = false
    this.animatedProjects = new Set()
    this.canvas = canvas
    this.create()
  }

  show (url) {
    this.list.enable()
    this.element.classList.add(this.classes.active)

    // Reset animation tracking when returning to home
    this.animatedProjects.clear()
    
    // Re-setup initial states for all projects
    this.setupInitialProjectStates()

    // Check if transitioning from intro page
    if (url === '/home' && !this.hasTransitionPlayed) {
      this.finishCoverTransition()
    }

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

  async hide () {
    // Dispatch event to lock hover animations
    window.dispatchEvent(new CustomEvent('homeTransitionStart'))
    
    // Animate text elements out with slide-up
    this.animateTextOutImmediate()
    
    // Wait for animation to complete before hiding
    await delay(400)
    
    this.list.disable()
    this.element.classList.remove(this.classes.active)

    // Reset canvas background to default
    if (this.canvas) {
      GSAP.to(this.canvas.background, {
        r: 248,
        g: 248,
        b: 248,
        duration: 0.5,
        ease: 'power2.inOut'
      })
    }
    
    // Reset text colors to default
    this.setLightTextMode(false)

    // Clean up intersection observer
    if (this.observer) {
      this.observer.disconnect()
    }

    await delay(400)

    return super.hide()
  }

  create () {
    super.create()

    this.createList()
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

  createIntersectionObserver () {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const projectId = entry.target.dataset.projectId || entry.target.querySelector('.home__link').href.split('/').pop()
          
          // Change background color based on visible project
          this.changeBackgroundColor(projectId)
          
          if (!this.animatedProjects.has(projectId)) {
            this.animateProjectIn(entry.target)
            this.animatedProjects.add(projectId)
          }
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
      const textElements = project.querySelectorAll('.home__link__number, .home__link__title, .home__link__description')
      const numberElements = project.querySelectorAll('.home__link__number')
      
      GSAP.set(textElements, {
        y: '100%',
        opacity: 0
      })
      
      numberElements.forEach(number => {
        GSAP.set(number, {
          '--underline-scale': 0
        })
      })
    })
  }

  animateProjectIn (project) {
    const textElements = project.querySelectorAll('.home__link__number, .home__link__title, .home__link__description')
    const numberElements = project.querySelectorAll('.home__link__number')
    
    if (textElements.length > 0) {
      GSAP.fromTo(textElements, {
        y: '100%',
        opacity: 0
      }, {
        y: '0%',
        opacity: 1,
        duration: 0.8,
        ease: 'expo.out',
        stagger: 0.04, // Only stagger within this project's 3 elements
        force3D: true,
        transformOrigin: 'center center'
      })
      
      // Animate underlines in
      numberElements.forEach(number => {
        GSAP.to(number, {
          '--underline-scale': 1,
          duration: 0.3,
          delay: 0.05,
          ease: 'power2.out'
        })
      })
    }
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
    const textElements = project.querySelectorAll('.home__link__number, .home__link__title, .home__link__description')
    const numberElements = project.querySelectorAll('.home__link__number')
    
    // Animate underlines out
    numberElements.forEach(number => {
      GSAP.to(number, {
        '--underline-scale': 0,
        duration: immediate ? 0.2 : 0.25,
        ease: immediate ? 'power2.out' : 'expo.in'
      })
    })
    
    if (textElements.length > 0) {
      GSAP.to(textElements, {
        y: '100%',
        opacity: 0,
        duration: immediate ? 0.4 : 0.5,
        ease: immediate ? 'power2.in' : 'expo.in',
        stagger: immediate ? 0.02 : 0.03,
        force3D: true,
        transformOrigin: 'center center'
      })
    }
  }

  changeBackgroundColor (projectId) {
    if (!this.canvas) return
    
    // Define project colors (RGB values for canvas)
    const projectColors = {
      'sazy': { r: 220, g: 210, b: 200 }, // much lighter brown
      'ffmag': { r: 131, g: 113, b: 95 }, // #83715f
      'popeyes': { r: 221, g: 26, b: 35 }, // #dd1a23
      'boxpark': { r: 255, g: 253, b: 60 }, // #fffd3c
      'spotify': { r: 238, g: 238, b: 238 }, // #eeeeee
      'stoli': { r: 255, g: 0, b: 66 }, // #ff0042
      'turning-tide': { r: 162, g: 138, b: 112 }, // #a28a70
      'idris-elba': { r: 0, g: 0, b: 0 }, // black
      'ocb': { r: 62, g: 90, b: 164 }, // #3e5aa4
      'jack-daniels': { r: 128, g: 128, b: 128 }, // grey
      'inbound': { r: 253, g: 203, b: 71 } // #fdcb47
    }
    
    // Dark backgrounds that need light text
    const darkBackgrounds = ['idris-elba', 'ocb', 'ffmag']
    
    const targetColor = projectColors[projectId]
    if (targetColor) {
      console.log('Changing canvas background for project:', projectId, targetColor)
      
      // Animate canvas background color
      GSAP.to(this.canvas.background, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          // Update overlay colors as the background animates
          this.updateOverlayColors(projectId)
        }
      })
      
      // Change text color based on background darkness
      if (darkBackgrounds.includes(projectId)) {
        this.setLightTextMode(true)
      } else {
        this.setLightTextMode(false)
      }
    }
  }

  setLightTextMode(isLight) {
    const textColor = isLight ? '#ffffff' : ''
    const duration = 0.5
    
    // Home page text
    GSAP.to('.home', {
      color: textColor,
      duration: duration,
      ease: 'power2.inOut'
    })
    
    // Navigation elements
    GSAP.to('.navigation__link', {
      color: textColor,
      duration: duration,
      ease: 'power2.inOut'
    })
    
    // Logo invert for dark backgrounds
    const logoImg = document.querySelector('.navigation__item:first-child img')
    if (logoImg) {
      GSAP.to(logoImg, {
        filter: isLight ? 'invert(0)' : 'invert(1)',
        duration: duration,
        ease: 'power2.inOut'
      })
    }
    
    // Easter egg button
    const easterBtn = document.querySelector('.navigation__easter')
    if (easterBtn) {
      GSAP.to(easterBtn, {
        backgroundColor: isLight ? '#ffffff' : '#2c2c2c',
        duration: duration,
        ease: 'power2.inOut'
      })
    }
  }

  updateOverlayColors(projectId) {
    if (!this.canvas) return
    
    // Get the current canvas background color
    const currentBg = this.canvas.background
    const overlayColor = `rgb(${Math.round(currentBg.r)}, ${Math.round(currentBg.g)}, ${Math.round(currentBg.b)})`
    
    // Update overlay colors to match current background
    GSAP.to([this.elements.overlayTop, this.elements.overlayBottom], {
      backgroundColor: overlayColor,
      duration: 0.5,
      ease: 'power2.inOut'
    })
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
