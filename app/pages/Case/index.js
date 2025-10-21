import each from 'lodash/each';
import Detection from 'classes/Detection';
import Page from 'components/Page';
import GSAP from 'gsap';
import { delay } from 'utils/math';
import SplitType from 'split-type';

export default class extends Page {
  constructor({ slider }) {
    super({
      classes: {
        active: 'cases--active',
        caseActive: 'case--active',
        mediaActive: 'case__gallery__media__placeholder--active'
      },
      element: '.cases',
      elements: {
        wrapper: '#trolli',
        cases: '.case'
      },
      isScrollable: true
    });

    this.slider = slider;
    this.animatedDescriptions = new Set();
    this.isReturningToWork = false;
    this.backToWorkLink = null;
    this.backToWorkListener = null;
    this.exitFadeTimeline = null;
    this.onBackToWorkClick = this.onBackToWorkClick.bind(this);
    this.shaderOverrideActive = false;
    this.lastShaderOverrideHex = null;
    this.create();
  }

  splitTextIntoLines(element) {
    const originalText = element.textContent.trim();
    const words = originalText.split(' ');
    
    // Store original styles
    const computedStyle = window.getComputedStyle(element);
    const originalLineHeight = computedStyle.lineHeight;
    const originalFontSize = computedStyle.fontSize;
    const containerWidth = element.offsetWidth;
    
    element.innerHTML = '';
    
    // Create a temporary container to measure text with proper wrapping
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      visibility: hidden;
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${containerWidth}px;
      font-size: ${originalFontSize};
      font-family: ${computedStyle.fontFamily};
      font-weight: ${computedStyle.fontWeight};
      line-height: ${originalLineHeight};
      word-wrap: break-word;
      white-space: normal;
      padding: ${computedStyle.padding};
      margin: 0;
    `;
    
    // Add original text to see how it naturally breaks
    tempContainer.textContent = originalText;
    document.body.appendChild(tempContainer);
    
    // Use a more sophisticated approach: measure each word addition
    let lines = [];
    let currentLine = [];
    let testSpan = document.createElement('span');
    testSpan.style.cssText = `
      font-size: ${originalFontSize};
      font-family: ${computedStyle.fontFamily};
      font-weight: ${computedStyle.fontWeight};
      white-space: nowrap;
      visibility: hidden;
      position: absolute;
      top: -9999px;
      left: -9999px;
    `;
    document.body.appendChild(testSpan);
    
    // Account for padding/margins in available width
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
    const availableWidth = containerWidth - paddingLeft - paddingRight - 20; // Extra margin for safety
    
    words.forEach((word, index) => {
      const testLine = [...currentLine, word];
      testSpan.textContent = testLine.join(' ');
      
      if (testSpan.offsetWidth > availableWidth && currentLine.length > 0) {
        // Current line is full, push it and start new line
        lines.push(currentLine.join(' '));
        currentLine = [word];
      } else {
        // Add word to current line
        currentLine.push(word);
      }
      
      // Add the last line
      if (index === words.length - 1 && currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }
    });

    // Cleanup temporary elements
    document.body.removeChild(tempContainer);
    document.body.removeChild(testSpan);

    // Create line elements with proper styling
    lines.forEach((lineText, index) => {
      const lineContainer = document.createElement('div');
      lineContainer.className = 'case__description__line';
      lineContainer.style.cssText = `
        overflow: hidden;
        line-height: ${originalLineHeight};
        margin: 0;
        padding: 0;
      `;
      
      const lineElement = document.createElement('span');
      lineElement.className = 'case__description__line__text';
      lineElement.textContent = lineText;
      lineElement.style.cssText = `
        display: block;
        transform: translateY(100%);
        will-change: transform;
      `;
      
      lineContainer.appendChild(lineElement);
      element.appendChild(lineContainer);
    });

    return element.querySelectorAll('.case__description__line__text');
  }

  prepareDescriptionText(descriptionElement) {
    // Only split if not already split
    if (!descriptionElement.querySelector('.case__description__line')) {
      this.splitTextIntoLines(descriptionElement);
    }
  }

  animateDescriptionLines(descriptionElement) {
    const lines = descriptionElement.querySelectorAll('.case__description__line__text');
    
    if (lines.length > 0) {
      GSAP.fromTo(lines, {
        y: '100%'
      }, {
        y: '0%',
        duration: 0.8,
        ease: 'expo.out',
        stagger: 0.08,
        force3D: true
      });
    }
  }

  setupDescriptionObserver() {
    this.descriptionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const descriptionId = entry.target.id || entry.target.className;
          
          if (!this.animatedDescriptions.has(descriptionId)) {
            this.animateDescriptionLines(entry.target);
            this.animatedDescriptions.add(descriptionId);
          }
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '0px 0px -20% 0px'
    });
  }



  animateCaseTitle() {
    const titleText = this.elements.wrapper.querySelector('.case__title__text')

    if (titleText) {
      // Split text into characters
      const split = new SplitType(titleText, {
        types: 'chars',
        tagName: 'span'
      })

      // Animate characters with stagger
      GSAP.fromTo(split.chars, {
        y: '100%'
      }, {
        y: '0%',
        duration: 0.75,
        ease: 'power3.out',
        stagger: 0.05,
        delay: 0.3
      })
    }
  }

  setupBackgroundColorFade() {
    // Get the case media element to know when to start fading
    this.caseMedia = this.elements.wrapper.querySelector('.case__media')
    this.navBackground = document.querySelector('.navigation__background')
    this.canvasBackgroundElement = document.querySelector('.canvas__background')
    this.navLinks = document.querySelectorAll('.navigation a, .navigation button')
    this.whiteColor = { r: 248, g: 248, b: 248 }
    // projectColor is set in changeBackgroundColor()
  }

  rgbToHex (color) {
    if (!color) return null

    const clamp = value => Math.max(0, Math.min(255, Math.round(value)))
    const toHex = value => clamp(value).toString(16).padStart(2, '0')

    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`
  }

  updateShaderOverrideColor (color, { immediate = false } = {}) {
    if (!color) return

    const hex = this.rgbToHex(color)
    if (!hex) return

    if (!immediate && this.lastShaderOverrideHex === hex) return

    this.lastShaderOverrideHex = hex

    window.dispatchEvent(new CustomEvent('shaderOverride', {
      detail: {
        colors: {
          color1: hex,
          color2: hex,
          color3: hex
        },
        immediate
      }
    }))

    this.shaderOverrideActive = true
  }

  clearShaderOverride () {
    if (!this.shaderOverrideActive) return

    this.shaderOverrideActive = false
    this.lastShaderOverrideHex = null

    window.dispatchEvent(new CustomEvent('shaderOverrideClear'))
  }

  updateBackgroundColorFade() {
    if (!this.caseMedia || !this.projectColor) return

    const caseHeader = this.elements.wrapper.querySelector('.case__header')
    if (!caseHeader) return

    const headerHeight = caseHeader.offsetHeight
    const triggerPoint = headerHeight - (window.innerHeight * 0.3)
    const fadeDistance = 400
    const fadeStartScroll = this.scroll.current - triggerPoint

    let progress = 0
    if (fadeStartScroll < 0) {
      progress = 0
    } else if (fadeStartScroll > fadeDistance) {
      progress = 1
    } else {
      progress = fadeStartScroll / fadeDistance
    }

    const whiteColor = this.whiteColor || { r: 248, g: 248, b: 248 }
    const colorR = this.projectColor.r + (whiteColor.r - this.projectColor.r) * progress
    const colorG = this.projectColor.g + (whiteColor.g - this.projectColor.g) * progress
    const colorB = this.projectColor.b + (whiteColor.b - this.projectColor.b) * progress

    if (this.canvas) {
      this.canvas.background.r = colorR
      this.canvas.background.g = colorG
      this.canvas.background.b = colorB
    }

    const r = Math.round(colorR)
    const g = Math.round(colorG)
    const b = Math.round(colorB)
    const bgColor = `rgb(${r}, ${g}, ${b})`

    this.updateShaderOverrideColor({ r, g, b })

    if (this.navBackground) {
      this.navBackground.style.setProperty('--nav-bg-color', bgColor)
      this.navBackground.style.background = bgColor
    }

    if (this.navLinks) {
      const textR = Math.round(255 - (255 * progress))
      const textG = Math.round(255 - (255 * progress))
      const textB = Math.round(255 - (255 * progress))

      this.navLinks.forEach(link => {
        link.style.color = `rgb(${textR}, ${textG}, ${textB})`
      })
    }
  }

  /**
   * Animations.
   */
  async show (url) {
    this.element.classList.add(this.classes.active)

    const id = url.replace('/case/', '').replace('/', '')
    this.currentCaseId = id

    this.elements.wrapper = Array.from(this.elements.cases).find(item => item.id === id)
    this.elements.wrapper.classList.add(this.classes.caseActive)
    this.elements.wrapper.style.opacity = '1'
    this.elements.wrapper.style.removeProperty('pointer-events')

    const caseImage = this.elements.wrapper.querySelector('.case__media__image')

    // Change canvas background to match project color
    this.changeBackgroundColor(id)

    this.scroll.limit = this.elements.wrapper.clientHeight - window.innerHeight

    if (Detection.isMobile()) {
      this.elements.image = this.elements.wrapper.querySelector('.case__media__image')

      if (!this.elements.image.src) {
        this.elements.image.src = this.elements.image.getAttribute(Detection.isWebPSupported() ? 'data-src-webp' : 'data-src')
      }
    }

    const medias = this.elements.wrapper.querySelectorAll('.case__gallery__media__placeholder')

    each(medias, media => {
      const image = new Image()

      image.className = 'case__gallery__media__image'
      image.src = media.getAttribute(Detection.isWebPSupported() ? 'data-src-webp' : 'data-src')
      image.decode().then(_ => {
        media.classList.add(this.classes.mediaActive)
        media.appendChild(image)
                this.onResize()

      })
    })

    // Setup description text animations
    this.setupDescriptionAnimations()

    // Setup back to work link handler
    this.setupBackToWorkHandler()

    // Animate case title with GSAP
    this.animateCaseTitle()

    // Setup background color fade
    this.setupBackgroundColorFade()

    // Handle slider transition if coming from home page
    if (this.slider && this.slider.isTransitioning) {
      // Position slider plane over case media element
      this.slider.positionOnCaseHeader(id)

      if (caseImage) {
        const previousTransition = caseImage.style.transition

        caseImage.style.transition = 'none'
        caseImage.style.opacity = '0'
        caseImage.style.visibility = 'visible'

        // Force reflow so the opacity jump happens instantly without CSS transition
        // eslint-disable-next-line no-unused-expressions
        caseImage.offsetHeight

        caseImage.style.transition = previousTransition || ''

        const revealDelay = 0.15
        const resetDelay = previousTransition ? 0.1 : 0

        GSAP.delayedCall(revealDelay, () => {
          caseImage.style.opacity = '1'
        })

        if (resetDelay > 0) {
          GSAP.delayedCall(revealDelay + resetDelay, () => {
            caseImage.style.transition = previousTransition
          })
        }
      }

      const sliderFadeDelay = 0.8
      GSAP.delayedCall(sliderFadeDelay, () => {
        this.slider.hide()
        window.dispatchEvent(new CustomEvent('unlockScroll'))
      })
    } else if (this.slider) {
      // Coming from elsewhere, hide the slider and show real image
      this.slider.hide()
      window.dispatchEvent(new CustomEvent('unlockScroll'))

      if (caseImage) {
        caseImage.style.opacity = '1'
        caseImage.style.visibility = 'visible'
      }
    } else {
      window.dispatchEvent(new CustomEvent('unlockScroll'))
    }

    return super.show()
  }

  setupDescriptionAnimations() {
    // Clear previous animations
    this.animatedDescriptions.clear()
    
    // Find description text elements
    const descriptionTexts = this.elements.wrapper.querySelectorAll('.case__description__text')
    
    // Prepare text splitting immediately (so text is hidden from start)
    descriptionTexts.forEach(descriptionText => {
      this.prepareDescriptionText(descriptionText)
    })
    
    // Setup intersection observer
    this.setupDescriptionObserver()
    
    // Observe description text elements for animation
    descriptionTexts.forEach(descriptionText => {
      this.descriptionObserver.observe(descriptionText)
    })
  }

  setupBackToWorkHandler() {
    if (this.backToWorkLink && this.backToWorkListener) {
      this.backToWorkLink.removeEventListener('click', this.backToWorkListener)
      this.backToWorkLink = null
      this.backToWorkListener = null
    }

    if (!this.elements.wrapper) return

    const backLink = this.elements.wrapper.querySelector('.case__back')

    if (!backLink) return

    this.backToWorkLink = backLink
    this.backToWorkListener = this.onBackToWorkClick
    backLink.addEventListener('click', this.backToWorkListener)
  }

  async onBackToWorkClick (event) {
    event.preventDefault()
    event.stopPropagation()

    if (this.isReturningToWork) return

    this.isReturningToWork = true

    window.dispatchEvent(new CustomEvent('lockScroll'))

    try {
      await this.scrollToTopForExit()

      const projectId = this.currentCaseId || (this.elements.wrapper ? this.elements.wrapper.id : null)

      const sliderPromise = this.startSliderReturnTransition(projectId)
      const fadePromise = this.animateCaseExitFade()

      const sliderAwaitable = sliderPromise && typeof sliderPromise.then === 'function'
        ? sliderPromise
        : Promise.resolve()
      const fadeAwaitable = fadePromise && typeof fadePromise.then === 'function'
        ? fadePromise
        : Promise.resolve()

      await Promise.all([sliderAwaitable, fadeAwaitable])

      this.clearShaderOverride()

      window.dispatchEvent(new CustomEvent('requestNavigation', {
        detail: { url: '/home' }
      }))
    } catch (error) {
      console.error('[Case] Error during back-to-work transition', error)
      this.clearShaderOverride()
      window.dispatchEvent(new CustomEvent('requestNavigation', {
        detail: { url: '/home' }
      }))
    } finally {
      this.isReturningToWork = false
    }
  }

  scrollToTopForExit () {
    if (!this.scroll) return Promise.resolve()

    return new Promise(resolve => {
      GSAP.to(this.scroll, {
        current: 0,
        target: 0,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: resolve,
        onInterrupt: resolve
      })
    })
  }

  startSliderReturnTransition (projectId) {
    if (!this.slider || typeof this.slider.transitionBackToHome !== 'function') {
      return Promise.resolve()
    }

    const canvas = this.slider.renderer ? this.slider.renderer.domElement : null
    const transitionPromise = this.slider.transitionBackToHome(projectId)

    if (canvas) {
      GSAP.fromTo(canvas, {
        opacity: 0,
        visibility: 'visible'
      }, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      })
    }

    return transitionPromise || Promise.resolve()
  }

  animateCaseExitFade () {
    if (!this.elements.wrapper) return Promise.resolve()

    if (this.exitFadeTimeline) {
      this.exitFadeTimeline.kill()
      this.exitFadeTimeline = null
    }

    const wrapper = this.elements.wrapper
    const heroImage = wrapper.querySelector('.case__media__image')
    const galleryImages = wrapper.querySelectorAll('.case__gallery__media__image')

    this.exitFadeTimeline = GSAP.timeline()

    this.exitFadeTimeline.set(wrapper, { pointerEvents: 'none' })

    if (heroImage) {
      this.exitFadeTimeline.to(heroImage, {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.inOut'
      }, 0)
    }

    if (galleryImages && galleryImages.length > 0) {
      this.exitFadeTimeline.to(galleryImages, {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.inOut',
        stagger: 0.04
      }, 0)
    }

    this.exitFadeTimeline.to(wrapper, {
      opacity: 0,
      duration: 0.55,
      ease: 'power2.inOut'
    }, 0)

    return new Promise(resolve => {
      this.exitFadeTimeline.eventCallback('onComplete', () => {
        this.exitFadeTimeline = null
        resolve()
      })

      this.exitFadeTimeline.eventCallback('onInterrupt', () => {
        this.exitFadeTimeline = null
        resolve()
      })
    })
  }

  changeBackgroundColor (projectId) {
    // Define project colors (same as Home page)
    const projectColors = {
      'sazy': { r: 220, g: 210, b: 200 }, // much lighter brown
      'ffmag': { r: 131, g: 113, b: 95 }, // #83715f
      'popeyes': { r: 147, g: 114, b: 132 }, // #937284
      'boxpark': { r: 255, g: 253, b: 60 }, // #fffd3c
      'spotify': { r: 238, g: 238, b: 238 }, // #eeeeee
      'stoli': { r: 255, g: 0, b: 66 }, // #ff0042
      'turning-tide': { r: 162, g: 138, b: 112 }, // #a28a70
      'idris-elba': { r: 0, g: 0, b: 0 }, // black
      'ocb': { r: 62, g: 90, b: 164 }, // #3e5aa4
      'jack-daniels': { r: 128, g: 128, b: 128 }, // grey
      'inbound': { r: 253, g: 203, b: 71 } // #fdcb47
    }

    const targetColor = projectColors[projectId]
    if (!targetColor) return

    console.log('Changing case page canvas background for project:', projectId, targetColor)

    // Store this as the project color for fade animation
    this.projectColor = { ...targetColor }
    this.updateShaderOverrideColor(targetColor, { immediate: true })

    if (this.canvas) {
      // Animate canvas background color
      GSAP.to(this.canvas.background, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 0.5,
        ease: 'power2.inOut'
      })
    }

    // Also animate navigation bar background to match
    const navBackground = document.querySelector('.navigation__background')
    if (navBackground) {
      const navBackgroundColors = {
        'sazy': 'rgb(220, 210, 200)',
        'ffmag': 'rgb(131, 113, 95)',
        'popeyes': 'rgb(147, 114, 132)',
        'boxpark': 'rgb(255, 253, 60)',
        'spotify': 'rgb(238, 238, 238)',
        'stoli': 'rgb(255, 0, 66)',
        'turning-tide': 'rgb(162, 138, 112)',
        'idris-elba': 'rgb(0, 0, 0)',
        'ocb': 'rgb(62, 90, 164)',
        'jack-daniels': 'rgb(128, 128, 128)',
        'inbound': 'rgb(253, 203, 71)',
        'default': 'rgb(248, 248, 248)'
      }

      const targetNavColor = navBackgroundColors[projectId] || navBackgroundColors['default']
      navBackground.style.background = targetNavColor
      navBackground.style.setProperty('--nav-bg-color', targetNavColor)
    }
  }

  async hide (nextUrl) {
    this.scroll.target = 0
    this.isReturningToWork = false
    this.currentCaseId = null
    this.clearShaderOverride()

    if (this.backToWorkLink && this.backToWorkListener) {
      this.backToWorkLink.removeEventListener('click', this.backToWorkListener)
      this.backToWorkLink = null
      this.backToWorkListener = null
    }

    if (this.exitFadeTimeline) {
      this.exitFadeTimeline.kill()
      this.exitFadeTimeline = null
    }

    // Show the real case image before leaving (in case canvas was being used)
    if (this.elements.wrapper) {
      const caseImage = this.elements.wrapper.querySelector('.case__media__image')
      if (caseImage) {
        caseImage.style.opacity = '1'
        caseImage.style.visibility = 'visible'

        window.requestAnimationFrame(() => {
          caseImage.style.removeProperty('opacity')
          caseImage.style.removeProperty('visibility')
        })
      }
    }

    this.elements.wrapper.classList.remove(this.classes.caseActive)

    this.element.classList.remove(this.classes.active)

    // Only reset background and navigation to default when NOT going back to home page
    const isGoingToHome = nextUrl && nextUrl === '/home'

    if (!isGoingToHome) {
      // Reset canvas background and navigation to default when leaving case page
      if (this.canvas) {
        GSAP.to(this.canvas.background, {
          r: 248,
          g: 248,
          b: 248,
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }

      // Reset navigation bar background to default
      const navElement = document.querySelector('.navigation')
      if (navElement) {
        GSAP.to(navElement, {
          '--nav-bg-color': 'rgb(248, 248, 248)',
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }
    }
    // Note: When going back to home, slider will be reset by Home.show()

    // Clean up intersection observer
    if (this.descriptionObserver) {
      this.descriptionObserver.disconnect()
    }

    await delay(Detection.isMobile() ? 400 : 1000)

    this.elements.wrapper = null

    return super.hide()
  }

  /**
   * Events
   */
  onResize () {
    super.onResize()

    each(this.elements.cases, element => {
      element.limit = element.clientHeight
    })
  }

  /**
   * Frames
   */
  update () {
    super.update()

    // Update background color fade based on scroll
    this.updateBackgroundColorFade()
  }
}









