import Page from 'components/Page'
import GSAP from 'gsap'
import SplitType from 'split-type'
import FontFaceObserver from 'fontfaceobserver'
import each from 'lodash/each'

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
        loader: '.intro__loader',
        loaderPercentage: '.intro__loader__percentage'
      },
      isScrollable: false
    });

    this.splitInstances = []; // Track SplitType instances for cleanup
    this.loadingProgress = 0;
    this.isLoaded = false;
    this.mouseX = 0;
    this.currentFontWeight = 500; // Track current font weight for smooth interpolation
    this.targetFontWeight = 500; // Target font weight
    this.currentOverlayFontWeight = 500; // Track current overlay font weight
    this.targetOverlayFontWeight = 500; // Target overlay font weight
    this.lastMouseTime = Date.now(); // Track when mouse last moved
    this.mouseStopped = false; // Track if mouse has stopped
    this.titleElements = null; // Will store DIGITAL and DESIGNER elements
    this.overlayElements = null; // Will store Tim Andrews and Portfolio 25 elements
    this.create();
  }

  setupVariableFont() {
    // Get all title elements
    const titleSpans = document.querySelectorAll('.intro__header__title__text span');
    if (titleSpans.length >= 4) {
      this.titleElements = [titleSpans[0], titleSpans[3]]; // DIGITAL and DESIGNER
      this.overlayElements = [titleSpans[1], titleSpans[2]]; // Tim Andrews and Portfolio 25
      
      // Set initial font-variation-settings for variable font
      this.titleElements.forEach(element => {
        element.style.fontVariationSettings = `"wght" 500`; // Starting weight
      });
      
      this.overlayElements.forEach(element => {
        element.style.fontVariationSettings = `"wght" 500`; // Starting weight
      });
    }
  }
  
  setupMouseTracking() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    document.addEventListener('mousemove', this.handleMouseMove);
    
    // Start smooth font weight animation loop
    this.animateFontWeight();
  }
  
  handleMouseMove(event) {
    // Calculate mouse position as percentage of viewport
    const mouseXPercent = event.clientX / window.innerWidth;
    const mouseYPercent = event.clientY / window.innerHeight;
    
    // Combine both X and Y movement for more dynamic control
    const combinedPercent = (mouseXPercent + mouseYPercent) / 2; // Average of both axes
    
    // Map to font weight range (350-800) for main titles - optimized for smooth interpolation
    this.targetFontWeight = 350 + (combinedPercent * 450); // 450 is the range (800-350)
    
    // Map to OPPOSITE font weight range for overlay elements (inverted)
    this.targetOverlayFontWeight = 800 - (combinedPercent * 450); // Inverted range
    
    // Update mouse movement tracking
    this.lastMouseTime = Date.now();
    this.mouseStopped = false;
  }
  
  animateFontWeight() {
    // Single synchronized animation for both title sets with same timing/easing
    GSAP.to(this, {
      currentFontWeight: this.targetFontWeight,
      currentOverlayFontWeight: this.targetOverlayFontWeight,
      duration: 5.0, // Same duration for both
      ease: 'expo.out', // Same easing for both
      onUpdate: () => {
        // Both sets update simultaneously with same properties but opposite weights
        if (this.titleElements) {
          this.titleElements.forEach(element => {
            element.style.fontVariationSettings = `"wght" ${Math.round(this.currentFontWeight)}`;
          });
        }
        
        if (this.overlayElements) {
          this.overlayElements.forEach(element => {
            element.style.fontVariationSettings = `"wght" ${Math.round(this.currentOverlayFontWeight)}`;
          });
        }
      }
    });
    
    // Continue animation loop
    requestAnimationFrame(() => this.animateFontWeight());
  }

  animateTitles() {
    // Clean GSAP implementation like Codrops - include all title text spans
    const titleSpans = document.querySelectorAll('.intro__header__title__text span');
    
    if (titleSpans.length === 0) return;
    
    // Kill any existing tweens to prevent conflicts
    GSAP.killTweensOf(titleSpans);
    
    // Set initial state with force3D for better performance
    GSAP.set(titleSpans, {
      y: '200%',
      force3D: true
    });
    
    // Larger delay to ensure DOM and fonts are ready
    setTimeout(() => {
      // Create smooth wipe animation with custom timing
      // First animate DIGITAL and DESIGNER (indexes 0 and 3)
      GSAP.to([titleSpans[0], titleSpans[3]], {
        y: '0%',
        duration: 1.2,
        ease: 'power4.out',
        stagger: 0.2,
        force3D: true
      });
      
      // Then animate Tim Andrews and Portfolio 25 (indexes 1 and 2) after delay
      setTimeout(() => {
        GSAP.to([titleSpans[1], titleSpans[2]], {
          y: '0%',
          duration: 1.2,
          ease: 'power4.out',
          stagger: 0.2,
          force3D: true
        });
      }, 600); // Start after DIGITAL/DESIGNER begin
    }, 100);
  }
  


  show() {
    this.element.classList.add(this.classes.active);
    this.element.classList.add('intro--loading');
    
    // Hide all content initially before animations
    this.hideContentForAnimations();
    
    // Setup variable font elements
    this.setupVariableFont();
    
    // Setup mouse tracking
    this.setupMouseTracking();
    
    // Start loader
    this.startLoader();

    return super.show();
  }
  
  hideContentForAnimations() {
    console.log('hideContentForAnimations called');
    
    // Debug: Log all positioning containers
    const header = document.querySelector('.intro__header');
    const wrapper = document.querySelector('.intro__wrapper');
    const content = document.querySelector('.intro__content');
    
    console.log('DEBUG - Container positions:');
    console.log('Header:', header ? header.getBoundingClientRect() : 'not found');
    console.log('Wrapper:', wrapper ? wrapper.getBoundingClientRect() : 'not found');
    console.log('Content:', content ? content.getBoundingClientRect() : 'not found');
    
    // Hide title spans
    const titleSpans = document.querySelectorAll('.intro__header__title__text span');
    console.log('Title spans found:', titleSpans.length);
    GSAP.set(titleSpans, {
      y: '200%',
      force3D: true
    });
    
    
    
    // Hide enter button container
    const enterContainer = document.querySelector('.intro__enter');
    console.log('Enter container found in hideContentForAnimations:', enterContainer);
    if (enterContainer) {
      console.log('Enter container position:', enterContainer.getBoundingClientRect());
      console.log('Setting enter container opacity to 0 initially');
      GSAP.set(enterContainer, {
        opacity: 0
      });
    } else {
      console.error('Enter container not found in hideContentForAnimations!');
    }
  }
  
  startLoader() {
    // Start loading progress immediately (no initial letterbox animation)
    this.startLoadingProgress();
  }
  
  startLoadingProgress() {
    // Track different loading stages
    const loadingStages = [
      { name: 'DOM', weight: 20 },
      { name: 'Fonts', weight: 40 },
      { name: 'Images', weight: 30 },
      { name: 'Ready', weight: 10 }
    ];
    
    let currentStage = 0;
    
    // Simulate progressive loading
    const updateProgress = () => {
      if (currentStage < loadingStages.length) {
        const stage = loadingStages[currentStage];
        const targetProgress = this.loadingProgress + stage.weight;
        
        this.animateProgressTo(targetProgress, () => {
          currentStage++;
          if (currentStage < loadingStages.length) {
            setTimeout(updateProgress, 200);
          } else {
            this.completeLoading();
          }
        });
      }
    };
    
    // Start loading sequence
    setTimeout(updateProgress, 300);
  }
  
  animateProgressTo(targetProgress, onComplete) {
    GSAP.to(this, {
      loadingProgress: targetProgress,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        const percentage = Math.floor(this.loadingProgress);
        if (this.elements.loaderPercentage) {
          this.elements.loaderPercentage.textContent = `${percentage}%`;
        }
      },
      onComplete
    });
  }
  
  completeLoading() {
    // Use intro overlay for letterbox transition  
    GSAP.to([this.elements.overlayTop, this.elements.overlayBottom], {
      scaleY: 1,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        // Hide loader behind the overlay
        this.elements.loader.classList.add('intro__loader--hidden');
        this.element.classList.remove('intro--loading');
        
        // Then reveal intro content
        setTimeout(() => {
          GSAP.to([this.elements.overlayTop, this.elements.overlayBottom], {
            scaleY: 0,
            duration: 0.12,
            ease: 'power2.inOut',
            onComplete: () => {
              this.startIntroAnimations();
            }
          });
        }, 0.1);
      }
    });
  }
  
  startIntroAnimations() {
    console.log('startIntroAnimations called');
    
    // Debug: Log positions after overlay animation
    setTimeout(() => {
      const header = document.querySelector('.intro__header');
      const enterContainer = document.querySelector('.intro__enter');
      
      console.log('DEBUG - After overlay animation:');
      console.log('Header position:', header ? header.getBoundingClientRect() : 'not found');
      console.log('Enter container position:', enterContainer ? enterContainer.getBoundingClientRect() : 'not found');
    }, 100);
    
    // Start animations sequence
    this.animateTitles();
    console.log('About to call animateEnterButton...');
    this.animateEnterButton();
  }
  
  animateEnterButton() {
    console.log('animateEnterButton called');
    
    const enterButton = document.querySelector('.intro__enter a');
    const enterContainer = document.querySelector('.intro__enter');
    
    console.log('Enter button:', enterButton);
    console.log('Enter container:', enterContainer);
    
    if (!enterButton) {
      console.error('Enter button not found! Available elements:');
      console.log('All .intro__enter elements:', document.querySelectorAll('.intro__enter'));
      console.log('All a elements in intro:', document.querySelectorAll('.intro a'));
      return;
    }
    
    console.log('Enter button text:', enterButton.textContent);
    console.log('Enter button initial styles:', {
      opacity: getComputedStyle(enterButton).opacity,
      transform: getComputedStyle(enterButton).transform,
      display: getComputedStyle(enterButton).display
    });
    
    try {
      // Create SplitType instance for letter-by-letter animation
      const splitInstance = new SplitType(enterButton, {
        types: 'chars',
        tagName: 'span'
      });
      
      console.log('SplitType created:', splitInstance);
      console.log('Split chars:', splitInstance.chars);
      console.log('Number of chars:', splitInstance.chars ? splitInstance.chars.length : 0);
      
      // Store instance for cleanup
      this.splitInstances.push(splitInstance);
      
      // Set container visible but DON'T modify position - let CSS handle it
      GSAP.set('.intro__enter', { 
        opacity: 1
        // Removed y: '0%' - let CSS position: fixed handle positioning
      });
      console.log('Set enter container opacity to 1 and y to 0%');
      
      // Start underline animation once the text is visible
      setTimeout(() => {
        const enterLink = document.querySelector('.intro__enter a');
        if (enterLink) {
          enterLink.classList.add('underline-active');
          
          // Add click handler for immediate fade out
          enterLink.addEventListener('click', (e) => {
            // Don't prevent default - let the normal navigation handle the transition
            
            // Just fade out the underline immediately
            enterLink.classList.remove('underline-active');
            
            GSAP.to(enterLink, {
              '--underline-opacity': 0,
              duration: 0.3,
              ease: 'power2.out'
            });
          });
        }
      }, 1000); // Start underline animation 1 second after text appears
      
      // Debug: Check final computed styles
      const enterContainer = document.querySelector('.intro__enter');
      const computedStyles = getComputedStyle(enterContainer);
      console.log('DEBUG - Final computed styles for enter container:');
      console.log('Element classes:', enterContainer.className);
      console.log('Position:', computedStyles.position);
      console.log('Bottom:', computedStyles.bottom);
      console.log('Left:', computedStyles.left);
      console.log('Transform:', computedStyles.transform);
      console.log('Z-index:', computedStyles.zIndex);
      console.log('Final position after GSAP:', enterContainer.getBoundingClientRect());
      
      // Debug: Check if there are any conflicting styles
      console.log('All CSS rules that might affect this element:');
      const allRules = [];
      for (let styleSheet of document.styleSheets) {
        try {
          for (let rule of styleSheet.cssRules) {
            if (rule.selectorText && rule.selectorText.includes('intro__enter')) {
              allRules.push(`${rule.selectorText}: ${rule.style.cssText}`);
            }
          }
        } catch (e) {
          console.log('Could not read stylesheet:', styleSheet.href);
        }
      }
      console.log('CSS rules for intro__enter:', allRules);
      
      if (splitInstance.chars && splitInstance.chars.length > 0) {
        GSAP.set(splitInstance.chars, {
          y: '105%',
          opacity: 0,
          force3D: true
        });
        console.log('Set chars hidden - y: 105%, opacity: 0');
        
        // Animate letters with cascading effect
        setTimeout(() => {
          console.log('Starting letter animation...');
          GSAP.to(splitInstance.chars, {
            y: '0%',
            opacity: 1,
            duration: 0.8,
            ease: 'power2.out',
            stagger: 0.05, // 50ms delay between each letter
            force3D: true,
            onComplete: () => {
              console.log('Letter animation completed');
            }
          });
        }, 800); // Start after other animations
      } else {
        console.error('No chars found after SplitType!');
      }
      
    } catch (error) {
      console.error('Error in animateEnterButton:', error);
    }
  }

  async hide() {
    // Animate everything out with GSAP before transitioning
    await this.animateOut();
    
    this.element.classList.remove(this.classes.active);
    
    // Clean up event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    
    // Clean up SplitType instances
    this.splitInstances.forEach(instance => {
      if (instance.revert) {
        instance.revert();
      }
    });
    this.splitInstances = [];
    
    return super.hide();
  }
  
  animateOut() {
    return new Promise((resolve) => {
      // Create timeline for coordinated exit animations
      const tl = GSAP.timeline({
        onComplete: resolve
      });
      
      // Animate enter button out first
      this.splitInstances.forEach((splitInstance) => {
        if (splitInstance.chars && splitInstance.chars.length > 0) {
          tl.to(splitInstance.chars, {
            y: '105%',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
            stagger: 0.02,
            force3D: true
          }, 0);
        }
      });
      
      
      
      // Animate titles out in reverse order
      const titleSpans = document.querySelectorAll('.intro__header__title__text span');
      if (titleSpans.length > 0) {
        // First animate Tim Andrews and Portfolio 25 out (indexes 1 and 2)
        tl.to([titleSpans[1], titleSpans[2]], {
          y: '200%',
          duration: 1.2,
          ease: 'power4.in',
          stagger: 0.1,
          force3D: true
        }, 0.3);
        
        // Then animate DIGITAL and DESIGNER out (indexes 0 and 3)
        tl.to([titleSpans[0], titleSpans[3]], {
          y: '200%',
          duration: 1.2,
          ease: 'power4.in',
          stagger: 0.1,
          force3D: true
        }, 0.8); // Start after overlay texts begin exiting
      }
    });
  }

  startCoverTransition() {
    // Use intro overlay for consistent transitions
    const overlayTop = this.elements.overlayTop;
    const overlayBottom = this.elements.overlayBottom;
    
    if (overlayTop && overlayBottom) {
      overlayTop.style.transform = 'scaleY(1)';
      overlayTop.style.transition = 'transform 0.6s cubic-bezier(0.645, 0.045, 0.355, 1)';
      
      overlayBottom.style.transform = 'scaleY(1)';
      overlayBottom.style.transition = 'transform 0.6s cubic-bezier(0.645, 0.045, 0.355, 1)';
    }
  }

  create() {
    super.create();

    const font = new FontFaceObserver('Neue Montreal', 10000);

    font.load().then(_ => {
      this.onResize();
    }).catch(_ => {
      this.onResize();
    });
  }

  onResize() {
    super.onResize();
  }

  update() {
    super.update();
  }
}