import Page from 'components/Page'
import Scrolling from 'components/Scrolling'
import GSAP from 'gsap'
import { delay } from 'utils/math'

export default class extends Page {
  constructor () {
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

  finishCoverTransition() {
    // Start with overlay covering screen
    GSAP.set([this.elements.overlayTop, this.elements.overlayBottom], { scaleY: 1 });

    const tl = GSAP.timeline();

    // Keep covered briefly, then reveal
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
        y: '-100%',
        opacity: 0,
        duration: immediate ? 0.4 : 0.5,
        ease: immediate ? 'power2.in' : 'expo.in',
        stagger: immediate ? 0.02 : 0.03,
        force3D: true,
        transformOrigin: 'center center'
      })
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
