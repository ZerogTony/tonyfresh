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
        overlayBottom: '.home__overlay__row--bottom',
        card: '.home__card',
        canvasBackground: '.canvas__background'
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
    .to(this.elements.card, {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      duration: 0.75,
      ease: 'power2.inOut'
    }, '-=0.3')
    .call(() => {
      this.hasTransitionPlayed = true;
    });

    return tl;
  }

  async hide (nextUrl) {
    // Dispatch event to lock hover animations
    window.dispatchEvent(new CustomEvent('homeTransitionStart'))
    
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
    if (!this.elements.canvasBackground) return

    // Define project colors (hex values for CSS)
    const projectColors = {
      'sazy': '#dcd2c8', // much lighter brown
      'ffmag': '#83715f',
      'popeyes': '#937284',
      'boxpark': '#fffd3c',
      'spotify': '#eeeeee',
      'stoli': '#ff0042',
      'turning-tide': '#a28a70',
      'idris-elba': '#000000', // black
      'ocb': '#3e5aa4',
      'jack-daniels': '#808080', // grey
      'inbound': '#fdcb47'
    }

    // Define text colors for each project
    const projectTextColors = {
      'sazy': '#F7F7F7',
      'ffmag': '#D9CEC3',
      'popeyes': '#FFE6E8', // much lighter pink for better contrast on red
      'boxpark': '#2C2C00', // dark olive for better contrast on yellow
      'spotify': '#B3A4A4',
      'stoli': '#ffffff', // fine as is
      'turning-tide': '#ffffff', // fine as is
      'idris-elba': '#ffffff', // fine as is (portenoire)
      'ocb': '#B8CCFF', // much lighter blue for better contrast on blue
      'jack-daniels': '#ffffff', // fine as is
      'inbound': '#FFF4C4' // much lighter yellow for better contrast on yellow
    }

    const targetColor = projectColors[projectId]
    if (targetColor) {
      console.log('Changing canvas background for project:', projectId, targetColor)

      // Animate canvas background color with gradients and navigation updating in real-time
      GSAP.to(this.elements.canvasBackground, {
        backgroundColor: targetColor,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          // Update background gradients and navigation color as the background animates
          this.updateBackgroundGradients()
        }
      })

      // Change text color to match the project
      this.setProjectTextColors(projectId, projectTextColors[projectId])
    }
  }

  setProjectTextColors(projectId, textColor) {
    const duration = 0.5
    const isLightText = textColor === '#ffffff'
    
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
    if (!this.elements.canvasBackground) return

    // Get the current canvas background color from computed style
    const bgColor = window.getComputedStyle(this.elements.canvasBackground).backgroundColor

    // Update the gradient backgrounds to match current color
    const topGradient = document.querySelector('.home__background__top')
    const bottomGradient = document.querySelector('.home__background__bottom')

    if (topGradient) {
      topGradient.style.background = `linear-gradient(to bottom, ${bgColor} 0%, transparent 100%)`
    }

    if (bottomGradient) {
      bottomGradient.style.background = `linear-gradient(to bottom, transparent 0%, ${bgColor} 100%)`
    }

    // Update navigation background to match current color
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
