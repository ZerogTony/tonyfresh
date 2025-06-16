
import Page from 'components/Page'

import FontFaceObserver from 'fontfaceobserver'

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
    }).catch(_ => {
      this.onResize()
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

