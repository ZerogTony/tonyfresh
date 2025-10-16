import each from 'lodash/each'
import Component from 'classes/Component'
import { random } from 'utils/math'
import GSAP from 'gsap'

export default class extends Component {
  constructor({ url }) {
    super({
      classes: {
        linksActive: 'navigation__link--active'
      },
      element: '.navigation',
      elements: {
        links: '.navigation__link',
        easter: '.navigation__easter'
      }
    })

    this.aboutGallery = document.querySelector('.about__gallery')
    this.homeCard = document.querySelector('.home__card')

    this.onChange(url)

    // Store the original background
    this.originalBackground = document.documentElement.style.background
    this.isOriginalBackground = true

    // Bind the easter egg method so 'this' works correctly
    this.onEasterEgg = this.onEasterEgg.bind(this)
  }

  /**
   * Events.
   */
  onChange(url) {
    each(this.elements.links, link => {
      const value = link.href.replace(window.location.origin, '')
      if (url === value) {
        link.classList.add(this.classes.linksActive)
      } else {
        link.classList.remove(this.classes.linksActive)
      }
    })
  }

  onEasterEgg() {
    console.log('onEasterEgg method called!')
    console.log('Current isOriginalBackground state:', this.isOriginalBackground)
    
    const offWhite = '#fef6ec'
    const offBlack = '#111111'
    const offWhiteText = '#000000' // original text color
    const offBlackText = '#f8f8f8' // dark theme text color
  
    console.log('Easter egg clicked, switching to:', this.isOriginalBackground ? 'dark' : 'light')
    
    // Check current transition on documentElement
    const currentTransition = getComputedStyle(document.documentElement).transition
    console.log('Current document transition:', currentTransition)
  
    if (this.isOriginalBackground) {
      console.log('Setting dark theme - Canvas will handle background animation')
  
      // Animate text color for page content
      document.querySelectorAll('.about, .case, .home, .about__gallery').forEach(el => {
        el.style.transition = 'color 0.5s ease-in-out'
        el.style.color = offBlackText
      })

      // Update navigation links to light color (for dark background)
      document.querySelectorAll('.navigation__link').forEach(el => {
        el.style.transition = 'color 0.5s ease-in-out'
        el.style.color = offBlackText
      })

      // Update logo image - no invert for dark background (logo is already light)
      document.querySelectorAll('.navigation__item:first-child img').forEach(img => {
        img.style.transition = 'filter 0.5s ease-in-out'
        img.style.filter = 'invert(0)' // No invert for dark background - logo stays light
      })

      // Update easter egg button to light color
      if (this.elements.easter) {
        this.elements.easter.style.transition = 'transform 0.4s cubic-bezier(0.645, 0.045, 0.355, 1), background-color 0.5s ease-in-out'
        this.elements.easter.style.backgroundColor = offBlackText // Light color for dark background
      }

      // Update navigation bar background to dark color
      const navBgElement = document.querySelector('.navigation__background')
      if (navBgElement) {
        GSAP.to(navBgElement, {
          '--nav-bg-color': offBlack,
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }
  
      // Hide gradients completely
      if (this.homeBottom) {
        this.homeBottom.style.opacity = '0'
      }

      if (this.homeTop) {
        this.homeTop.style.opacity = '0'
      }

      // Change white card to black (inverse of white text)
      if (this.homeCard) {
        GSAP.to(this.homeCard, {
          backgroundColor: offBlack,
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }

      if (this.canvas) {
        console.log('Animating canvas background to dark:', { r: 17, g: 17, b: 17 })
        console.log('Canvas background before animation:', this.canvas.background)

        // Animate individual RGB components for smoother transition
        GSAP.to(this.canvas.background, {
          r: 17,
          g: 17,
          b: 17,
          duration: 0.5,
          ease: 'power2.inOut',
          onUpdate: () => {
            console.log('Canvas RGB animating:',
              `r:${Math.round(this.canvas.background.r)} g:${Math.round(this.canvas.background.g)} b:${Math.round(this.canvas.background.b)}`
            )
          },
          onComplete: () => {
            console.log('Canvas background animation complete:', this.canvas.background)
          }
        })
      }
    } else {
      console.log('Setting light theme - Canvas will handle background animation')
  
      document.querySelectorAll('.about, .case, .home, .about__gallery').forEach(el => {
        el.style.transition = 'color 0.5s ease-in-out'
        el.style.color = offWhiteText
      })

      // Update navigation links to dark color (for light background)
      document.querySelectorAll('.navigation__link').forEach(el => {
        el.style.transition = 'color 0.5s ease-in-out'
        el.style.color = offWhiteText
      })

      // Revert logo image - invert for light background (make logo dark)
      document.querySelectorAll('.navigation__item:first-child img').forEach(img => {
        img.style.transition = 'filter 0.5s ease-in-out'
        img.style.filter = 'invert(1)' // Invert for light background - make logo dark
      })

      // Revert easter egg button to original dark color
      if (this.elements.easter) {
        this.elements.easter.style.transition = 'transform 0.4s cubic-bezier(0.645, 0.045, 0.355, 1), background-color 0.5s ease-in-out'
        this.elements.easter.style.backgroundColor = '#2c2c2c' // Dark grey for light background (approximate $color-iron)
      }

      // Revert navigation bar background to light color
      const navBgElement = document.querySelector('.navigation__background')
      if (navBgElement) {
        GSAP.to(navBgElement, {
          '--nav-bg-color': offWhite,
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }
  
      // Hide gradients completely
      if (this.homeBottom) {
        this.homeBottom.style.opacity = '0'
      }

      if (this.homeTop) {
        this.homeTop.style.opacity = '0'
      }

      // Change card back to white (inverse of black text)
      if (this.homeCard) {
        GSAP.to(this.homeCard, {
          backgroundColor: '#ffffff',
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }

      if (this.canvas) {
        const lightBg = this.getOriginalCanvasBackground()
        console.log('Animating canvas background to light:', lightBg)
        console.log('Canvas background before light animation:', this.canvas.background)

        // Animate individual RGB components for smoother transition
        GSAP.to(this.canvas.background, {
          r: lightBg.r,
          g: lightBg.g,
          b: lightBg.b,
          duration: 0.5,
          ease: 'power2.inOut',
          onUpdate: () => {
            console.log('Canvas RGB animating to light:',
              `r:${Math.round(this.canvas.background.r)} g:${Math.round(this.canvas.background.g)} b:${Math.round(this.canvas.background.b)}`
            )
          },
          onComplete: () => {
            console.log('Canvas background animation to light complete:', this.canvas.background)
          }
        })
      }
    }
  
    this.isOriginalBackground = !this.isOriginalBackground
  }
  


  updateTextColor(selector, color) {
    const elements = document.querySelectorAll(selector)
    elements.forEach(el => {
      el.style.color = color
    })
  }

  getOriginalCanvasBackground() {
    // Placeholder for your original canvas background color
    return {
      r: 248, // Original red component
      g: 248, // Original green component
      b: 248  // Original blue component
    }
  }

  /**
   * Listeners.
   */
  addEventListeners() {
    console.log('Adding easter egg listener to:', this.elements.easter)
    if (this.elements.easter) {
      this.elements.easter.addEventListener('click', this.onEasterEgg)
      console.log('Easter egg listener added successfully')
    } else {
      console.error('Easter egg element not found!')
    }
  }
}
