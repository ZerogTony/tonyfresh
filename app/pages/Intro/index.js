import Page from 'components/Page'
import GSAP from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import SplitType from 'split-type'

export default class extends Page {
  constructor() {
    super({
      classes: {
        active: 'intro--active'
      },
      element: '.intro',
      elements: {
        preloader: '.intro__preloader',
        splitOverlay: '.intro__split-overlay',
        tagsOverlay: '.intro__tags-overlay'
      },
      isScrollable: false
    });

    this.timeline = null;
    this.onAnimationComplete = null; // Callback to navigate to home
    this.create();
  }

  splitTextElements(selector, type = 'words,chars', addFirstChar = false) {
    const elements = document.querySelectorAll(selector);

    elements.forEach((element) => {
      const split = new SplitType(element, {
        types: type,
        tagName: 'span'
      });

      if (type.includes('chars') && split.chars) {
        split.chars.forEach((char, index) => {
          const originalText = char.textContent;
          char.innerHTML = `<span>${originalText}</span>`;

          if (addFirstChar && index === 0) {
            char.classList.add('first-char');
          }
        });
      }
    });
  }

  setupAnimation() {
    // Register CustomEase plugin
    GSAP.registerPlugin(CustomEase);
    CustomEase.create("hop", ".8, 0, .3, 1");

    // Split all text elements
    this.splitTextElements(".intro__intro-title h1", "words,chars", true);
    this.splitTextElements(".intro__second-title h1", "words,chars");
    this.splitTextElements(".intro__outro-title h1");
    this.splitTextElements(".intro__tag p", "words");

    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth <= 1000;
    const isPhone = viewportWidth <= 600;

    const phoneTargetFontPx = Math.min(viewportWidth * 0.22, 48);
    const phoneInitialFontPx = Math.max(phoneTargetFontPx * 0.85, 34);

    const outroInitialX = isPhone ? '-3rem' : (isMobile ? '-3rem' : '-8rem');
    const outroInitialFontSize = isPhone ? `${phoneInitialFontPx}px` : (isMobile ? '6rem' : '14rem');
    const outroTargetX = isPhone ? '-6rem' : (isMobile ? '-6rem' : '-15rem');
    const outroTargetFontSize = isPhone ? `${phoneTargetFontPx}px` : (isMobile ? '6rem' : '14rem');

    // Set initial states
    GSAP.set(
      [
        ".intro__split-overlay .intro__intro-title .first-char span",
        ".intro__split-overlay .intro__outro-title .char span",
      ],
      { y: "0%" }
    );

    GSAP.set(".intro__split-overlay .intro__intro-title .first-char", {
      x: isMobile ? "7.5rem" : "18rem",
      y: isMobile ? "-1rem" : "-2.75rem",
      fontWeight: "900",
      scale: 0.75,
    });

    GSAP.set(".intro__split-overlay .intro__outro-title .char", {
      x: outroInitialX,
      fontSize: outroInitialFontSize,
      fontWeight: "500",
    });

    // Create main timeline
    this.timeline = GSAP.timeline({ defaults: { ease: "hop" } });
    const tags = GSAP.utils.toArray(".intro__tag");

    // Tag reveals
    tags.forEach((tag, index) => {
      this.timeline.to(
        tag.querySelectorAll("p .word"),
        {
          y: "0%",
          duration: 0.75,
        },
        0.5 + index * 0.1
      );
    });

    // Main animation sequence
    this.timeline
      .to(
        ".intro__preloader .intro__intro-title .char span",
        {
          y: "0%",
          duration: 0.75,
          stagger: 0.05,
        },
        0.5
      )
      .to(
        ".intro__preloader .intro__intro-title .char span",
        {
          y: "100%",
          duration: 0.75,
          stagger: 0.05,
        },
        2
      )
      .to(
        ".intro__preloader .intro__second-title .char span",
        {
          y: "0%",
          duration: 0.75,
          stagger: 0.05,
        },
        2.5
      )
      // Digital and Design reveal simultaneously with stagger
      .to(
        ".intro__preloader .intro__second-title .char span",
        {
          y: "0%",
          duration: 0.75,
          stagger: 0.05,
        },
        3.5
      )
      .to(
        ".intro__preloader .intro__outro-title .char span",
        {
          y: "0%",
          duration: 0.75,
          stagger: 0.075,
        },
        3.5
      )
      // Digital staggers out
      .to(
        ".intro__preloader .intro__second-title .char span",
        {
          y: "100%",
          duration: 0.75,
          stagger: 0.05,
        },
        4.5
      )
      // Design moves and enlarges
      .to(
        ".intro__preloader .intro__outro-title .char",
        {
          x: outroTargetX,
          duration: 1,
        },
        5
      )
      .to(
        ".intro__preloader .intro__outro-title .char",
        {
          fontSize: outroTargetFontSize,
          fontWeight: "500",
          duration: 0.75,
          onComplete: () => {
            GSAP.set(".intro__preloader", {
              clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)",
            });
            GSAP.set(".intro__split-overlay", {
              clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)",
            });
          },
        },
        6
      );

    // Tag exits
    tags.forEach((tag, index) => {
      this.timeline.to(
        tag.querySelectorAll("p .word"),
        {
          y: "100%",
          duration: 0.75,
        },
        6.5 + index * 0.1
      );
    });

    // Final reveal - split layers slide apart
    this.timeline
      .to(
        [".intro__preloader", ".intro__split-overlay"],
        {
          y: (i) => (i === 0 ? "-50%" : "50%"),
          duration: 1,
          onStart: () => {
            // Make intro background transparent to reveal home page underneath
            GSAP.to(this.element, {
              backgroundColor: "transparent",
              duration: 0.3
            });
          },
          onComplete: () => {
            // Trigger navigation to home page when split completes
            if (this.onAnimationComplete) {
              this.onAnimationComplete();
            }
          }
        },
        7
      );
  }

  show() {
    this.element.classList.add(this.classes.active);

    // Setup and start animation
    this.setupAnimation();

    return super.show();
  }

  async hide() {
    // Kill timeline if it exists
    if (this.timeline) {
      this.timeline.kill();
    }

    // Remove active class to trigger CSS transition
    this.element.classList.remove(this.classes.active);

    // Wait for CSS transition to complete
    await new Promise(resolve => setTimeout(resolve, 400));

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
