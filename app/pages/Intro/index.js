import Page from 'components/Page'
import GSAP from 'gsap'

export default class extends Page {
  constructor() {
    super({
      classes: {
        active: 'intro--active'
      },
      element: '.intro',
      elements: {
        wrapper: '.intro__content',
        title: '.intro__header__title',
        titles: '.intro__header__title__text span',
        overlayTop: '.intro__overlay__row--top',
        overlayBottom: '.intro__overlay__row--bottom',
        descriptions: '.intro__description p',
        image: '.intro__image',
        imageInner: '.intro__image__inner',
        loader: '.intro__loader',
        loaderPercentage: '.intro__loader__percentage'
      },
      isScrollable: false
    });

    this.mouse = { x: 0, y: 0 }
    this.targetWeights = {
      digitalDesigner: 350,
      timAndrews: 800,
      portfolio25: 800
    }
    this.currentWeights = {
      digitalDesigner: 350,
      timAndrews: 800,
      portfolio25: 800
    }
    this.animationFrameId = null
    
    this.create();
  }

  setupVariableFont() {
    // Set up mouse tracking for variable font weight control
    this.handleMouseMove = this.handleMouseMove.bind(this)
    document.addEventListener('mousemove', this.handleMouseMove)
    
    // Start the animation loop for smooth interpolation
    this.updateFontWeights()
  }

  handleMouseMove(event) {
    // Get mouse position
    this.mouse.x = event.clientX
    this.mouse.y = event.clientY
    
    // Get window dimensions
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    // Calculate normalized positions (0 to 1)
    const normalizedX = this.mouse.x / windowWidth
    const normalizedY = this.mouse.y / windowHeight
    
    // Combine X and Y movement - use both axes for more dynamic control
    const combinedFactor = (normalizedX + normalizedY) * 0.5 // Average of both axes
    
    // Set target weights based on combined mouse position
    // DIGITAL/DESIGNER: 350-800 (lighter to heavier)
    this.targetWeights.digitalDesigner = 350 + (combinedFactor * (800 - 350))
    
    // TIM ANDREWS/PORTFOLIO 25: 800-350 (inverted - heavier to lighter)  
    this.targetWeights.timAndrews = 800 - (combinedFactor * (800 - 350))
    this.targetWeights.portfolio25 = 800 - (combinedFactor * (800 - 350))
  }

  updateFontWeights() {
    // Smooth interpolation toward target weights with inertia
    const lerpFactor = 0.02 // Lower = more lag/inertia (5.0 second feel)
    
    this.currentWeights.digitalDesigner += (this.targetWeights.digitalDesigner - this.currentWeights.digitalDesigner) * lerpFactor
    this.currentWeights.timAndrews += (this.targetWeights.timAndrews - this.currentWeights.timAndrews) * lerpFactor
    this.currentWeights.portfolio25 += (this.targetWeights.portfolio25 - this.currentWeights.portfolio25) * lerpFactor
    
    // Apply the weights to the DOM elements
    const digitalSpan = document.querySelector('.intro__header__title__center-text:first-of-type span')
    const designerSpan = document.querySelector('.intro__header__title__center-text:last-of-type span')
    const timAndrewsSpan = document.querySelector('.intro__header__title__overlay span')
    const portfolio25Span = document.querySelector('.intro__header__title__overlay-right span')
    
    if (digitalSpan) {
      digitalSpan.style.fontVariationSettings = `"wght" ${this.currentWeights.digitalDesigner}`
    }
    if (designerSpan) {
      designerSpan.style.fontVariationSettings = `"wght" ${this.currentWeights.digitalDesigner}`
    }
    if (timAndrewsSpan) {
      timAndrewsSpan.style.fontVariationSettings = `"wght" ${this.currentWeights.timAndrews}`
    }
    if (portfolio25Span) {
      portfolio25Span.style.fontVariationSettings = `"wght" ${this.currentWeights.portfolio25}`
    }
    
    // Continue the animation loop
    this.animationFrameId = requestAnimationFrame(() => this.updateFontWeights())
  }

  animateTitles() {
    const digitalSpan = document.querySelector('.intro__header__title__center-text:first-of-type span')
    const designerSpan = document.querySelector('.intro__header__title__center-text:last-of-type span')
    const timAndrewsSpan = document.querySelector('.intro__header__title__overlay span')
    const portfolio25Span = document.querySelector('.intro__header__title__overlay-right span')
    
    // Set initial state
    GSAP.set([digitalSpan, designerSpan], { y: '200%' })
    GSAP.set([timAndrewsSpan, portfolio25Span], { y: '200%' })
    
    // Animate DIGITAL and DESIGNER first
    GSAP.to([digitalSpan, designerSpan], {
      y: '0%',
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.1,
      delay: 0.3
    })
    
    // Then animate TIM ANDREWS and PORTFOLIO 25
    GSAP.to([timAndrewsSpan, portfolio25Span], {
      y: '0%',
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.1,
      delay: 0.8
    })
  }

  animateImage() {
    const imageInner = document.querySelector('.intro__image__inner')
    
    if (imageInner) {
      GSAP.set(imageInner, { y: '100%' })
      
      GSAP.to(imageInner, {
        y: '0%',
        duration: 1.0,
        ease: 'expo.out',
        delay: 1.5
      })
    }
  }

  animateEnterButton() {
    const enterContainer = document.querySelector('.intro__enter')
    const enterLink = document.querySelector('.intro__enter a')
    
    if (!enterContainer || !enterLink) {
      console.error('Enter button elements not found!')
      return
    }
    
    // Split text into individual letters for animation
    const originalText = enterLink.textContent
    const letters = originalText.split('').map(letter => {
      const span = document.createElement('span')
      span.textContent = letter === ' ' ? '\u00A0' : letter // Use non-breaking space for spaces
      span.style.display = 'inline-block'
      span.style.opacity = '0'
      span.style.transform = 'translateY(105%)'
      return span
    })
    
    // Replace text with letter spans
    enterLink.innerHTML = ''
    letters.forEach(letter => enterLink.appendChild(letter))
    
    // Set container visible and reset position
    GSAP.set(enterContainer, { 
      opacity: 1,
      y: '0%'
    })
    
    // Animate letters with cascading effect
    setTimeout(() => {
      GSAP.to(letters, {
        y: '0%',
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.05, // 50ms delay between each letter
        onComplete: () => {
          // Start underline animation when letters complete
          enterLink.classList.add('underline-active')
          
          // Set up click handler for underline fade
          enterLink.addEventListener('click', () => {
            // Immediately hide underline
            enterLink.classList.remove('underline-active')
            enterLink.classList.remove('underline-final')
            
            // Force underline to disappear immediately
            const afterElement = window.getComputedStyle(enterLink, '::after')
            enterLink.style.setProperty('--underline-transform', 'scaleX(0)')
            
            // Also stop any CSS animations on the ::after pseudo-element
            enterLink.style.animation = 'none'
            const existingStyle = enterLink.querySelector('style')
            if (existingStyle) {
              existingStyle.remove()
            }
            
            // Create and inject CSS to override the ::after element
            const style = document.createElement('style')
            style.textContent = `
              .intro__enter a::after {
                animation: none !important;
                transform: scaleX(0) !important;
                opacity: 0 !important;
              }
            `
            document.head.appendChild(style)
          })
        }
      })
    }, 2200) // Start after other animations
  }

  show() {
    this.element.classList.add(this.classes.active);
    this.element.classList.add('intro--loading');
    
    // Hide all content initially before animations
    this.hideContentForAnimations();
    
    // Start loader
    this.startLoader();

    return super.show();
  }

  hideContentForAnimations() {
    // Hide title spans
    const titleSpans = [
      document.querySelector('.intro__header__title__center-text:first-of-type span'),
      document.querySelector('.intro__header__title__center-text:last-of-type span'),
      document.querySelector('.intro__header__title__overlay span'),
      document.querySelector('.intro__header__title__overlay-right span')
    ].filter(Boolean)
    
    GSAP.set(titleSpans, { y: '200%' })
    
    // Hide red rectangle
    const imageInner = document.querySelector('.intro__image__inner')
    if (imageInner) {
      GSAP.set(imageInner, { y: '100%' })
    }
    
    // Hide enter button container
    const enterContainer = document.querySelector('.intro__enter')
    if (enterContainer) {
      GSAP.set(enterContainer, { opacity: 0, y: '100%' })
    }
  }

  startLoader() {
    // Simple loading progression
    let progress = 0
    const duration = 2000 // 2 seconds total loading time
    const startTime = Date.now()
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      progress = Math.min((elapsed / duration) * 100, 100)
      
      if (this.elements.loaderPercentage) {
        this.elements.loaderPercentage.textContent = `${Math.floor(progress)}%`
      }
      
      if (progress < 100) {
        requestAnimationFrame(updateProgress)
      } else {
        this.completeLoading()
      }
    }
    
    updateProgress()
  }

  completeLoading() {
    // Use intro overlay for letterbox transition  
    GSAP.to([this.elements.overlayTop, this.elements.overlayBottom], {
      scaleY: 1,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        // Hide loader behind the overlay
        if (this.elements.loader) {
          this.elements.loader.style.display = 'none'
        }
        this.element.classList.remove('intro--loading');
        
        // Then reveal intro content
        setTimeout(() => {
          GSAP.to([this.elements.overlayTop, this.elements.overlayBottom], {
            scaleY: 0,
            duration: 0.3,
            ease: 'power2.inOut',
            onComplete: () => {
              this.startIntroAnimations();
            }
          });
        }, 100);
      }
    });
  }

  startIntroAnimations() {
    // Start animations
    this.animateTitles()
    this.animateImage()
    this.animateEnterButton()
    
    // Set up variable font system
    this.setupVariableFont()
  }

  async hide() {
    // Clean up mouse tracking
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    document.removeEventListener('mousemove', this.handleMouseMove)
    
    // Animate out
    const titleSpans = [
      document.querySelector('.intro__header__title__center-text:first-of-type span'),
      document.querySelector('.intro__header__title__center-text:last-of-type span'),
      document.querySelector('.intro__header__title__overlay span'),
      document.querySelector('.intro__header__title__overlay-right span')
    ].filter(Boolean)
    
    const imageInner = document.querySelector('.intro__image__inner')
    const enterContainer = document.querySelector('.intro__enter')
    
    // Animate everything out in reverse order
    if (enterContainer) {
      // Animate letters back down in reverse stagger
      const enterLink = enterContainer.querySelector('a')
      if (enterLink) {
        const letters = enterLink.querySelectorAll('span')
        if (letters.length > 0) {
          GSAP.to(letters, {
            y: '105%',
            opacity: 0,
            duration: 0.6,
            ease: 'power2.in',
            stagger: -0.03, // Reverse stagger (negative)
            onComplete: () => {
              GSAP.to(enterContainer, { opacity: 0, y: '100%', duration: 0.3, ease: 'power2.inOut' })
            }
          })
        } else {
          GSAP.to(enterContainer, { opacity: 0, y: '100%', duration: 0.6, ease: 'power2.inOut' })
        }
      } else {
        GSAP.to(enterContainer, { opacity: 0, y: '100%', duration: 0.6, ease: 'power2.inOut' })
      }
    }
    
    if (imageInner) {
      GSAP.to(imageInner, { y: '100%', duration: 0.8, ease: 'power2.inOut', delay: 0.1 })
    }
    
    if (titleSpans.length > 0) {
      await new Promise(resolve => {
        GSAP.to(titleSpans, {
          y: '200%',
          duration: 1.0,
          ease: 'power2.inOut',
          stagger: 0.1,
          delay: 0.2,
          onComplete: resolve
        })
      })
    }
    
    this.element.classList.remove(this.classes.active)
    return super.hide();
  }

  create() {
    super.create();
  }

  onResize() {
    super.onResize();
  }

  update() {
    super.update();
  }
}