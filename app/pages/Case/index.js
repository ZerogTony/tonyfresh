import each from 'lodash/each';
import Detection from 'classes/Detection';
import Page from 'components/Page';
import GSAP from 'gsap';
import { delay } from 'utils/math';

export default class extends Page {
  constructor() {
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

  
  
  /**
   * Animations.
   */
  show (url) {
    this.element.classList.add(this.classes.active)

    const id = url.replace('/case/', '').replace('/', '')

    this.elements.wrapper = Array.from(this.elements.cases).find(item => item.id === id)
    this.elements.wrapper.classList.add(this.classes.caseActive)

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

  async hide () {
    this.scroll.target = 0

    this.elements.wrapper.classList.remove(this.classes.caseActive)

    this.element.classList.remove(this.classes.active)

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

