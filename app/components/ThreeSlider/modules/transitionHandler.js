/**
 * Transition handling for ThreeSlider
 * Manages transitions between home and case pages
 */

import { lerp } from 'utils/math'

/**
 * Calculates transform values for given bounds
 * @param {Object} bounds - Target bounds {left, top, width, height}
 * @param {Object} viewport - Viewport dimensions {width, height}
 * @param {Object} screen - Screen dimensions {width, height}
 * @param {Object} initialDimensions - Initial plane dimensions
 * @returns {Object} Transform values {scaleX, scaleY, posX, posY}
 */
export function calculateTransformForBounds (bounds, viewport, screen, initialDimensions) {
  if (!bounds) return null

  const targetWorldWidth = (bounds.width / screen.width) * viewport.width
  const targetWorldHeight = (bounds.height / screen.height) * viewport.height

  const targetScaleX = targetWorldWidth / initialDimensions.width
  const targetScaleY = targetWorldHeight / initialDimensions.height

  const targetPosX = -(viewport.width / 2) + (targetWorldWidth / 2) + (bounds.left / screen.width) * viewport.width
  const targetPosY = (viewport.height / 2) - (targetWorldHeight / 2) - (bounds.top / screen.height) * viewport.height

  return {
    scaleX: targetScaleX,
    scaleY: targetScaleY,
    posX: targetPosX,
    posY: targetPosY
  }
}

/**
 * Interpolates between start and end bounds
 * @param {Object} startBounds - Starting bounds
 * @param {Object} endBounds - Ending bounds
 * @param {number} progress - Transition progress (0-1)
 * @returns {Object} Interpolated bounds
 */
export function interpolateBounds (startBounds, endBounds, progress) {
  return {
    width: lerp(startBounds.width, endBounds.width, progress),
    height: lerp(startBounds.height, endBounds.height, progress),
    left: lerp(startBounds.left, endBounds.left, progress),
    top: lerp(startBounds.top, endBounds.top, progress)
  }
}

/**
 * Gets home transition bounds
 * @param {Object} viewport - Viewport world dimensions
 * @param {Object} screen - Screen pixel dimensions
 * @param {Object} initialDimensions - Initial plane dimensions
 * @param {number} homeBaseScale - Home base scale
 * @param {number} homeOffsetRatio - Home offset ratio
 * @returns {Object} Home bounds
 */
export function getHomeTransitionBounds (viewport, screen, initialDimensions, homeBaseScale, homeOffsetRatio) {
  const targetWorldWidth = initialDimensions.width * homeBaseScale
  const targetWorldHeight = initialDimensions.height * homeBaseScale

  const targetPixelWidth = (targetWorldWidth / viewport.width) * screen.width
  const targetPixelHeight = (targetWorldHeight / viewport.height) * screen.height

  const startLeft = (screen.width - targetPixelWidth) / 2
  const startTop = (screen.height - targetPixelHeight) / 2
  const offsetPx = screen.height * homeOffsetRatio

  return {
    left: startLeft,
    top: startTop + offsetPx,
    width: targetPixelWidth,
    height: targetPixelHeight
  }
}

/**
 * Waits for slider to settle at target position
 * @param {Function} checkFn - Function that returns {settled, position}
 * @param {number} targetPosition - Target position to settle at
 * @param {number} threshold - Settle threshold
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Promise that resolves with {settled, hasTimedOut}
 */
export function waitForSettle (checkFn, targetPosition, threshold, timeout = 900) {
  const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
  const startTime = now()

  return new Promise(resolve => {
    let rafId = null

    const check = () => {
      const { position, isStable } = checkFn()
      const distance = Math.abs(position - targetPosition)
      const settled = distance < threshold && isStable
      const hasTimedOut = (now() - startTime) >= timeout

      if (settled || hasTimedOut) {
        resolve({ settled, hasTimedOut })
        return
      }

      rafId = requestAnimationFrame(check)
    }

    check()

    // Cleanup on promise completion
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  })
}

/**
 * Creates transition state object
 * @param {string} direction - Transition direction ('forward' or 'reverse')
 * @param {string} projectId - Project ID
 * @param {Object} startBounds - Start bounds
 * @param {Object} endBounds - End bounds
 * @returns {Object} Transition state
 */
export function createTransitionState (direction, projectId, startBounds, endBounds) {
  return {
    isTransitioning: true,
    direction,
    projectId,
    startBounds,
    endBounds,
    progress: direction === 'forward' ? 0 : 1,
    promise: null,
    resolver: null
  }
}
