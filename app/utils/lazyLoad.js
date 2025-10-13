import Detection from 'classes/Detection'

export default class LazyLoad {
  constructor () {
    this.images = []
    this.observer = null
    this.initialized = false
  }

  init () {
    if (this.initialized) return

    // Find all images with data-src attributes
    const images = document.querySelectorAll('[data-src], [data-src-webp]')

    if (!images.length) return

    // Use IntersectionObserver for lazy loading
    const options = {
      root: null,
      rootMargin: Detection.isMobile() ? '200px' : '400px', // Load earlier on desktop
      threshold: 0.01
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target)
          this.observer.unobserve(entry.target)
        }
      })
    }, options)

    images.forEach(img => {
      this.observer.observe(img)
      this.images.push(img)
    })

    this.initialized = true
  }

  loadImage (element) {
    const isWebPSupported = Detection.isWebPSupported()
    const src = isWebPSupported
      ? element.getAttribute('data-src-webp') || element.getAttribute('data-src')
      : element.getAttribute('data-src')

    if (!src) return

    // Handle IMG elements
    if (element.tagName === 'IMG') {
      element.src = src
      element.removeAttribute('data-src')
      element.removeAttribute('data-src-webp')
    }
    // Handle DIV/SPAN elements (case gallery placeholders)
    else {
      const img = new Image()

      img.onload = () => {
        element.style.backgroundImage = `url(${src})`
        element.classList.add('loaded')
        element.removeAttribute('data-src')
        element.removeAttribute('data-src-webp')

        // Hide loader
        const loader = element.previousElementSibling
        if (loader && loader.classList.contains('case__gallery__media__loader')) {
          loader.style.opacity = '0'
          setTimeout(() => {
            loader.style.display = 'none'
          }, 300)
        }
      }

      img.onerror = () => {
        console.error('Failed to load image:', src)
        element.classList.add('error')
      }

      img.src = src
    }
  }

  // Update observer when new images are added (e.g., page transitions)
  update () {
    if (this.observer) {
      this.observer.disconnect()
    }
    this.initialized = false
    this.images = []
    this.init()
  }

  destroy () {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.images = []
    this.initialized = false
  }
}
