
import Page from 'components/Page'

import FontFaceObserver from 'fontfaceobserver'
import GSAP from 'gsap'

import each from 'lodash/each'

import Detection from 'classes/Detection'

import { BREAKPOINT_PHONE } from 'utils/breakpoints'
import { getOffset } from 'utils/dom'
import { clamp, delay } from 'utils/math'

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
          
      },
      isScrollable: false
    });

    this.create();
  }

  /**
   * Animations.
   */
  show() {
    this.element.classList.add(this.classes.active);

    return super.show();
  }

  async hide() {
    this.element.classList.remove(this.classes.active);

    await delay(400);

    return super.hide();
  }

  /**
   * Create.
   */
  create() {
    super.create();

    const font = new FontFaceObserver('Neue Montreal', 10000)

    font.load().then(_ => {
      this.onResize()
      this.setupInfiniteScroll()
    }).catch(_ => {
      this.onResize()
      this.setupInfiniteScroll()
    })

  }




  /**
   * Events.
   */
  onResize() {
    super.onResize();
  }

  /**
   * Loop.
   */
  update() {
    super.update();
  }

  setupInfiniteScroll() {
    const container = document.querySelector('#infinite-scroll-text');
    if (!container) return;

    const words = container.querySelectorAll('.words');
    if (words.length < 2) return;

    const splitWords = Array.from(words).map(word => {
      const chars = word.textContent.trim().split('');
      word.innerHTML = '';
      const spans = chars.map(char => {
        const span = document.createElement('span');
        span.textContent = char;
        word.appendChild(span);
        return span;
      });
      return { chars: spans };
    });

    const wordHeight = words[0].offsetHeight;
    const offset = 40;
    const totalHeight = splitWords[0].chars.length * (wordHeight - offset);

    splitWords[1].chars.forEach(char => {
      GSAP.set(char, { y: totalHeight });
    });

    this.infiniteScrollAnimations = [];

    splitWords.forEach(splitWord => {
      splitWord.chars.forEach((char, index) => {
        const anim = GSAP.to(char, {
          y: `-=${totalHeight}`,
          repeat: -1,
          duration: 0.3,
          ease: 'none',
          delay: index * 0.3 / splitWords[0].chars.length,
          paused: true,
          timeScale: 0
        });

        this.infiniteScrollAnimations.push(anim);
      });
    });

    container.addEventListener('mouseover', () => {
      this.infiniteScrollAnimations.forEach(anim => {
        anim.resume();
        GSAP.to(anim, { timeScale: 1, duration: 0.5 });
      });
    });

    container.addEventListener('mouseout', () => {
      this.infiniteScrollAnimations.forEach(anim => {
        GSAP.to(anim, { timeScale: 0, duration: 0.5 });
      });
    });
  }
}

document.querySelector('.intro__enter a').addEventListener('click', function(event) {
  // Prevent the default link action
  event.preventDefault();

  // Get the href attribute of the link
  var href = this.getAttribute('href');

  // Add reverse animation to header title
  var headerTitle = document.querySelector('.intro__header__title');
  headerTitle.classList.add('intro__header__title--reverse');

  // Add reverse animation to image
  var image = document.querySelector('.intro__image');
  image.classList.add('intro__image--reverse');

  // Add reverse animation to description
  var description = document.querySelector('.intro__description');
  description.classList.add('intro__description--reverse');

  // Redirect after a delay
  setTimeout(function() {
    window.location.href = home;
  }, 1500); // Adjust this delay based on your longest animation duration
});

