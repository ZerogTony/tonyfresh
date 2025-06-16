import each from 'lodash/each'
import Component from 'classes/Component'
import { random } from 'utils/math'

export default class extends Component {
  constructor({ canvas, url }) {
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

    this.canvas = canvas
    this.homeBottom = document.querySelector('.home__background__bottom')
    this.homeTop = document.querySelector('.home__background__top')
    this.aboutGallery = document.querySelector('.about__gallery')

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
    const offWhite = '#fef6ec'
    const offBlack = '#111111'
    const offWhiteText = '#000000' // original text color
    const offBlackText = '#f8f8f8' // dark theme text color
  
    if (this.isOriginalBackground) {
      // Set transition inline and force reflow
      document.documentElement.style.transition = 'background-color 0.5s ease-in-out'
      void document.documentElement.offsetWidth; // force reflow
      document.documentElement.style.backgroundColor = offBlack
  
      // Animate text color
      document.querySelectorAll('.about, .case, .home, .about__gallery').forEach(el => {
        el.style.transition = 'color 0.5s ease-in-out'
        el.style.color = offBlackText
      })
  
      // Update gradient backgrounds
      this.homeBottom.style.transition = 'background 0.5s ease-in-out'
      this.homeBottom.style.background = `linear-gradient(to bottom, transparent 0%, ${offBlack} 100%)`
  
      this.homeTop.style.transition = 'background 0.5s ease-in-out'
      this.homeTop.style.background = `linear-gradient(to bottom, ${offBlack} 0%, transparent 100%)`
  
      if (this.canvas) {
        this.canvas.background = { r: 17, g: 17, b: 17 }
      }
    } else {
      // Revert to original off-white
      document.documentElement.style.transition = 'background-color 0.5s ease-in-out'
      void document.documentElement.offsetWidth; // force reflow
      document.documentElement.style.backgroundColor = offWhite
  
      document.querySelectorAll('.about, .case, .home, .about__gallery').forEach(el => {
        el.style.transition = 'color 0.5s ease-in-out'
        el.style.color = offWhiteText
      })
  
      this.homeBottom.style.transition = 'background 0.5s ease-in-out'
      this.homeBottom.style.background = ''
  
      this.homeTop.style.transition = 'background 0.5s ease-in-out'
      this.homeTop.style.background = ''
  
      if (this.canvas) {
        this.canvas.background = this.getOriginalCanvasBackground()
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
    this.elements.easter.addEventListener('click', this.onEasterEgg)
  }
}
