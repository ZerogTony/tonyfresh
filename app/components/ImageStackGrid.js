import GSAP from 'gsap'
import Component from 'classes/Component'

export default class ImageStackGrid extends Component {
  constructor({ element, elements }) {
    super({ element, elements })

    this.isAnimating = false
    this.isExpanded = false
    
    this.setupInitialState()
    this.addEventListeners()
  }

  setupInitialState() {
    // Add stack-mode class to all items initially
    this.elements.items.forEach((item, index) => {
      item.classList.add('stack-mode')
      
      // Set initial stack state for all items
      GSAP.set(item, {
        x: '-50%',
        y: '-50%',
        z: -index * 3, // Stack depth
        rotationY: index * 1.5, // Slight rotation variety
        rotationX: Math.sin(index) * 0.5,
        scale: 1 - index * 0.03, // Smaller as they stack
      })

      // Initial media positioning in stack
      const media = item.querySelector('.home__link__media')
      if (media) {
        GSAP.set(media, {
          scale: 0.7,
          opacity: 0.9
        })
      }
    })
  }

  expandToGrid() {
    if (this.isAnimating || this.isExpanded) return
    
    this.isAnimating = true
    
    const tl = GSAP.timeline({
      onComplete: () => {
        this.isAnimating = false
        this.isExpanded = true
        this.element.classList.add('grid-expanded')
      }
    })

    // Create grid positions
    const gridPositions = this.calculateGridPositions()

    // Animate items to grid positions
    this.elements.items.forEach((item, index) => {
      const { x, y, rotation } = gridPositions[index]
      
      // Remove stack-mode and add grid-mode class
      tl.call(() => {
        item.classList.remove('stack-mode')
        item.classList.add('grid-mode')
      }, [], index * 0.1)
      
      tl.to(item, {
        duration: 1.2,
        ease: 'power3.out',
        x: x,
        y: y,
        z: 0,
        rotationX: 0,
        rotationY: rotation,
        scale: 1,
        delay: index * 0.1
      }, 0)

      // Animate media
      const media = item.querySelector('.home__link__media')
      if (media) {
        tl.to(media, {
          duration: 1,
          ease: 'back.out(1.7)',
          scale: 1,
          opacity: 1,
          delay: index * 0.1 + 0.2
        }, 0)
      }

      // Text animation is handled by CSS classes now
    })

    return tl
  }

  collapseToStack() {
    if (this.isAnimating || !this.isExpanded) return
    
    this.isAnimating = true
    
    const tl = GSAP.timeline({
      onComplete: () => {
        this.isAnimating = false
        this.isExpanded = false
        this.element.classList.remove('grid-expanded')
      }
    })

    // Reverse animation back to stack
    this.elements.items.forEach((item, index) => {
      // Remove grid-mode and add stack-mode class
      tl.call(() => {
        item.classList.remove('grid-mode')
        item.classList.add('stack-mode')
      }, [], (this.elements.items.length - index - 1) * 0.05)
      
      tl.to(item, {
        duration: 1,
        ease: 'power3.inOut',
        x: '-50%',
        y: '-50%',
        z: -index * 3,
        rotationY: index * 1.5,
        rotationX: Math.sin(index) * 0.5,
        scale: 1 - index * 0.03,
        delay: (this.elements.items.length - index - 1) * 0.05
      }, 0)

      // Animate media back
      const media = item.querySelector('.home__link__media')
      if (media) {
        tl.to(media, {
          duration: 0.8,
          ease: 'power2.inOut',
          scale: 0.7,
          opacity: 0.9,
          delay: (this.elements.items.length - index - 1) * 0.05
        }, 0)
      }
    })

    return tl
  }

  calculateGridPositions() {
    const itemCount = this.elements.items.length
    const cols = Math.ceil(Math.sqrt(itemCount))
    const rows = Math.ceil(itemCount / cols)
    
    const containerWidth = window.innerWidth
    const containerHeight = window.innerHeight
    
    const itemWidth = containerWidth / cols
    const itemHeight = containerHeight / rows
    
    return this.elements.items.map((_, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      
      const x = (col * itemWidth) + (itemWidth / 2) - (containerWidth / 2)
      const y = (row * itemHeight) + (itemHeight / 2) - (containerHeight / 2)
      
      // Add some random rotation for visual interest
      const rotation = (Math.random() - 0.5) * 10
      
      return { x, y, rotation }
    })
  }

  addEventListeners() {
    // Toggle on click
    this.element.addEventListener('click', (event) => {
      // Don't trigger on link clicks
      if (event.target.closest('a')) return
      
      if (this.isExpanded) {
        this.collapseToStack()
      } else {
        this.expandToGrid()
      }
    })

    // Auto-expand after a delay
    setTimeout(() => {
      this.expandToGrid()
    }, 2000)
  }

  onResize() {
    if (this.isExpanded && !this.isAnimating) {
      // Recalculate grid positions on resize
      const gridPositions = this.calculateGridPositions()
      
      this.elements.items.forEach((item, index) => {
        const { x, y } = gridPositions[index]
        GSAP.set(item, { x, y })
      })
    }
  }
}