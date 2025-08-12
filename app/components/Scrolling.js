import NormalizeWheel from 'normalize-wheel'
import Prefix from 'prefix'
import each from 'lodash/each'
import Component from 'classes/Component'
import { getOffset } from 'utils/dom'
import { lerp } from 'utils/math'

export default class extends Component {
  constructor({ element, elements }) {
    super({ element, elements })

    this.transformPrefix = Prefix('transform')

    this.scroll = {
      ease: 0.04,
      position: 0,
      current: 0,
      target: 0,
      last: 0,
      clamp: 0
    }

    this.isDown = false
    this.scrollTimeout = null
    this.raf = null

    this.setupItems()
  }

  setupItems() {
    each(this.elements.items, element => {
      const offset = getOffset(element)
      element.extra = 0
      element.height = offset.height
      element.offset = offset.top
      element.position = 0
    })

    this.length = this.elements.items.length
    this.height = this.elements.items[0].getBoundingClientRect().height
    this.heightTotal = this.elements.list.getBoundingClientRect().height
  }

  enable() {
    if (this.isEnabled) return
    this.isEnabled = true
    this.updateLoop()
  }

  disable() {
    this.isEnabled = false
    if (this.raf) cancelAnimationFrame(this.raf)
  }

  onTouchDown(event) {
    if (!this.isEnabled) return
    this.isDown = true
    this.scroll.position = this.scroll.current
    this.start = event.touches ? event.touches[0].clientY : event.clientY
    clearTimeout(this.scrollTimeout)
  }

  onTouchMove(event) {
    if (!this.isDown || !this.isEnabled) return

    const y = event.touches ? event.touches[0].clientY : event.clientY
    const distance = (this.start - y) * 3
    this.scroll.target = this.scroll.position + distance
  }

  onTouchUp() {
    if (!this.isEnabled) return
    this.isDown = false
    this.snapAfterDelay()
  }

  onWheel(event) {
    if (!this.isEnabled) return

    const normalized = NormalizeWheel(event)
    const speed = normalized.pixelY * 2.2
    this.scroll.target += speed

    this.snapAfterDelay()
  }

  snapAfterDelay() {
    clearTimeout(this.scrollTimeout)
    this.scrollTimeout = setTimeout(() => {
      this.snapToNearest()
    }, 150)
  }

  snapToNearest() {
    const viewportCenter = window.innerHeight / 2

    let closestItem = null
    let minDistance = Infinity

    this.elements.items.forEach(item => {
      const itemTop = item.offsetTop + item.extra
      const itemCenter = itemTop + item.offsetHeight / 2
      const distance = Math.abs(this.scroll.current + viewportCenter - itemCenter)

      if (distance < minDistance) {
        minDistance = distance
        closestItem = item
      }
    })

    if (closestItem) {
      const itemTop = closestItem.offsetTop + closestItem.offsetHeight / 2
      this.scroll.target = itemTop - viewportCenter
    }
  }

  transform(element, y) {
    element.style[this.transformPrefix] = `translate3d(0, ${Math.floor(y)}px, 0)`
  }

  update() {
    if (!this.isEnabled) return

    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease)

    // 🌀 Wrap scroll for infinite loop
    if (this.scroll.current < 0) {
      this.scroll.current += this.heightTotal
      this.scroll.target += this.heightTotal
    } else if (this.scroll.current > this.heightTotal) {
      this.scroll.current -= this.heightTotal
      this.scroll.target -= this.heightTotal
    }

    const scrollClamp = Math.round(this.scroll.current % this.heightTotal)
    this.direction = this.scroll.current < this.scroll.last ? 'down' : 'up'

    each(this.elements.items, (element) => {
      element.position = -this.scroll.current - element.extra
      const offset = element.position + element.offset + element.height

      element.isBefore = offset < 0
      element.isAfter = offset > this.heightTotal

      if (this.direction === 'up' && element.isBefore) {
        element.extra -= this.heightTotal
        element.isBefore = false
        element.isAfter = false
      }

      if (this.direction === 'down' && element.isAfter) {
        element.extra += this.heightTotal
        element.isBefore = false
        element.isAfter = false
      }

      element.clamp = element.extra % scrollClamp
      this.transform(element, element.position)
    })

    this.scroll.last = this.scroll.current
    this.scroll.clamp = scrollClamp
  }

  updateLoop() {
    this.update()
    this.raf = requestAnimationFrame(this.updateLoop.bind(this))
  }

  onResize() {
    this.setupItems()

    this.scroll = {
      ...this.scroll,
      position: 0,
      current: 0,
      target: 0,
      last: 0
    }
  }
}
