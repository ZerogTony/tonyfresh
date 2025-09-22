import each from 'lodash/each';
import Detection from 'classes/Detection';
import Page from 'components/Page';
import GSAP from 'gsap';
import { delay } from 'utils/math';

export default class extends Page {
  constructor(canvas) {
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

    this.animatedDescriptions = new Set();
    this.canvas = canvas;
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
      GSAP.fromTo(titleText, {
        y: '200%'
      }, {
        y: '0%',
        duration: 1.2,
        ease: 'expo.out',
        delay: 0.3
      })
    }
  }

  /**
   * Animations.
   */
  show (url) {
    this.element.classList.add(this.classes.active)

    const id = url.replace('/case/', '').replace('/', '')

    this.elements.wrapper = Array.from(this.elements.cases).find(item => item.id === id)
    this.elements.wrapper.classList.add(this.classes.caseActive)

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
    const backLink = this.elements.wrapper.querySelector('.case__back')
    
    if (backLink) {
      backLink.addEventListener('click', (e) => {
        e.preventDefault()
        this.fadeOutImagesAndNavigate()
      })
    }
  }

  fadeOutImagesAndNavigate() {
    console.log('=== BACK TO WORK CLICKED ===')
    console.log('Current scroll position:', this.scroll.current)
    console.log('Scroll target:', this.scroll.target)

    // Directly animate both current and target for immediate fast scroll
    GSAP.to(this.scroll, {
      current: 0,
      target: 0,
      duration: 0.50,
      ease: 'power2.inOut',
      onUpdate: () => {
        console.log('Scrolling... current position:', this.scroll.current, 'target:', this.scroll.target)
      },
      onComplete: () => {
        console.log('🏁 Scroll animation complete, starting image fade...')
        this.proceedWithNavigation()
      }
    })
  }

  proceedWithNavigation() {
    console.log('🎬 Starting navigation transition...')

    // Fade out images and navigate
    const images = this.elements.wrapper.querySelectorAll('.case__gallery__media__image, .case__media__image')
    console.log('Images found for fade out:', images.length)
    console.log('Images:', images)
    console.log('Current wrapper:', this.elements.wrapper)

    if (images.length > 0) {
      // Check current opacity of first image
      console.log('Current opacity of first image:', window.getComputedStyle(images[0]).opacity)

      GSAP.to(images, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
        stagger: 0.01,
        onStart: () => {
          console.log('🖼️ Starting image fade out...')
        },
        onUpdate: () => {
          console.log('Fading images, first image opacity:', window.getComputedStyle(images[0]).opacity)
        },
        onComplete: () => {
          console.log('✅ Image fade complete, navigating to home')
          // Navigate to home after animation completes
          window.history.pushState(null, null, '/home')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      })
    } else {
      console.log('⚠️ No images found, navigating immediately')
      // If no images found, navigate immediately
      window.history.pushState(null, null, '/home')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  changeBackgroundColor (projectId) {
    if (!this.canvas) return
    
    // Define project colors (same as Home page)
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
    
    const targetColor = projectColors[projectId]
    if (targetColor) {
      console.log('Changing case page canvas background for project:', projectId, targetColor)
      
      // Animate canvas background color
      GSAP.to(this.canvas.background, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 0.5,
        ease: 'power2.inOut'
      })

      // Also animate navigation bar background to match
      const navElement = document.querySelector('.navigation')
      if (navElement) {
        const navBackgroundColors = {
          'sazy': 'rgb(220, 210, 200)',
          'ffmag': 'rgb(131, 113, 95)',
          'popeyes': 'rgb(221, 26, 35)',
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
        GSAP.to(navElement, {
          '--nav-bg-color': targetNavColor,
          duration: 0.5,
          ease: 'power2.inOut'
        })
      }
    }
  }

  async hide (nextUrl) {
    this.scroll.target = 0

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
}

