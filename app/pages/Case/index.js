import each from 'lodash/each';
import Detection from 'classes/Detection';
import Page from 'components/Page';
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

    this.create();
    this.addEventListeners();
  }

  addEventListeners() {
    const toggleButtons = document.querySelectorAll('.case__description__toggle');
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const caseId = button.getAttribute('data-case-id');
        this.toggleDescription(caseId);
      });
    });

    this.observeDescriptions();
  }

  toggleDescription(caseId) {
    const button = document.querySelector(`button[data-case-id="${caseId}"]`);
    const description = document.getElementById(caseId).querySelector('.case__description');
  
    if (description.style.display === 'none' || description.style.display === '') {
      description.style.display = 'block';
      button.style.display = 'none';
    } else {
      description.style.display = 'none';
      button.style.display = 'block';
    }
  }

  observeDescriptions() {
    const descriptions = document.querySelectorAll('.case__description');
  
    const observerCallback = (entries) => {
      entries.forEach(entry => {
        const id = entry.target.id;
        console.log(`Observing: ${id}, isIntersecting: ${entry.isIntersecting}`);
        if (id && !entry.isIntersecting) {
          this.toggleDescriptionOff(id);
        }
      });
    };
  
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.1 });
    descriptions.forEach(description => {
      if (description.id) { // Ensure the element has an ID
        observer.observe(description);
      } else {
        console.error('Description element is missing an ID:', description);
      }
    });
  }
  

  toggleDescriptionOff(caseId) {
    console.log('Toggling off description for:', caseId);
  
    // Find the description element
    const description = document.getElementById(caseId);
    console.log(`Looking for description with ID: ${caseId}, found:`, description);
  
    // The caseId for the button is the part before '-description'
    const buttonCaseId = caseId.split('-')[0];
    const button = document.querySelector(`button[data-case-id="${buttonCaseId}"]`);
    console.log(`Looking for button with data-case-id: ${buttonCaseId}, found:`, button);
  
    if (description && button) {
      description.style.display = 'none';
      button.style.display = 'block';
    } else {
      console.error('Could not find elements for:', caseId);
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

    this.scroll.limit = this.elements.wrapper.limit - window.innerHeight

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
      })
    })

    return super.show()
  }

  async hide () {
    this.scroll.target = 0

    this.elements.wrapper.classList.remove(this.classes.caseActive)

    this.element.classList.remove(this.classes.active)

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


function toggleDescription(caseId) {
  var descriptionElement = document.getElementById(caseId).querySelector('.case__description');
  if (descriptionElement.style.display === 'none') {
      descriptionElement.style.display = 'block'; // or 'flex'
  } else {
      descriptionElement.style.display = 'none';
  }
}