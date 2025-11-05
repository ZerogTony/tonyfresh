/**
 * Event management for ThreeSlider
 * Centralized event dispatching and types
 */

/**
 * Event types used by ThreeSlider
 */
export const SliderEvents = {
  PROJECT_CHANGE: 'sliderProjectChange',
  SCROLL_START: 'sliderScrollStart',
  SCROLL_PROGRESS: 'sliderScrollProgress',
  SETTLED: 'sliderSettled',
  TRANSITION_START: 'sliderTransitionStart',
  TRANSITION_COMPLETE: 'sliderTransitionComplete'
}

/**
 * Dispatches a project change event
 * @param {number} projectIndex - Project index
 * @param {string} projectId - Project ID
 * @param {boolean} isStable - Whether slider is stable
 */
export function dispatchProjectChange (projectIndex, projectId, isStable) {
  window.dispatchEvent(new CustomEvent(SliderEvents.PROJECT_CHANGE, {
    detail: {
      projectIndex,
      projectId,
      isStable
    }
  }))
}

/**
 * Dispatches a scroll start event
 * @param {number} direction - Scroll direction (1 or -1)
 * @param {number} currentIndex - Current project index
 */
export function dispatchScrollStart (direction, currentIndex) {
  window.dispatchEvent(new CustomEvent(SliderEvents.SCROLL_START, {
    detail: {
      direction: Math.sign(direction),
      currentIndex
    }
  }))
}

/**
 * Dispatches a scroll progress event for background color blending
 * @param {number} currentIndex - Current texture index
 * @param {number} nextIndex - Next texture index
 * @param {string} currentId - Current project ID
 * @param {string} nextId - Next project ID
 * @param {number} t - Progress between current and next (0-1)
 */
export function dispatchScrollProgress (currentIndex, nextIndex, currentId, nextId, t) {
  window.dispatchEvent(new CustomEvent(SliderEvents.SCROLL_PROGRESS, {
    detail: {
      currentIndex,
      nextIndex,
      currentId,
      nextId,
      t
    }
  }))
}

/**
 * Dispatches a settled event
 * @param {number} projectIndex - Settled project index
 * @param {string} projectId - Settled project ID
 */
export function dispatchSettled (projectIndex, projectId) {
  window.dispatchEvent(new CustomEvent(SliderEvents.SETTLED, {
    detail: {
      projectIndex,
      projectId
    }
  }))
}

/**
 * Dispatches a transition start event
 * @param {string} projectId - Project ID
 * @param {string} direction - Transition direction ('forward' or 'reverse')
 */
export function dispatchTransitionStart (projectId, direction) {
  window.dispatchEvent(new CustomEvent(SliderEvents.TRANSITION_START, {
    detail: {
      projectId,
      direction
    }
  }))
}

/**
 * Dispatches a transition complete event
 * @param {string} projectId - Project ID
 * @param {string} direction - Transition direction ('forward' or 'reverse')
 */
export function dispatchTransitionComplete (projectId, direction) {
  window.dispatchEvent(new CustomEvent(SliderEvents.TRANSITION_COMPLETE, {
    detail: {
      projectId,
      direction
    }
  }))
}

/**
 * Throttles event emissions to reduce chatter
 * @param {Function} fn - Function to throttle
 * @param {number} threshold - Threshold for throttling
 * @returns {Function} Throttled function
 */
export function createThrottledEmitter (fn, threshold = 0.01) {
  let lastEmit = {
    t: undefined,
    currentIndex: undefined,
    nextIndex: undefined
  }

  return (currentIndex, nextIndex, currentId, nextId, t) => {
    const shouldEmit =
      lastEmit.t === undefined ||
      Math.abs(t - lastEmit.t) > threshold ||
      lastEmit.currentIndex !== currentIndex ||
      lastEmit.nextIndex !== nextIndex

    if (shouldEmit) {
      lastEmit = { t, currentIndex, nextIndex }
      fn(currentIndex, nextIndex, currentId, nextId, t)
    }
  }
}
