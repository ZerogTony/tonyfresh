/**
 * Scroll handling logic for ThreeSlider
 * Manages scroll position, intensity, and stability
 */

import { lerp } from 'utils/math'

/**
 * Determines texture indices based on scroll position
 * @param {number} position - Current scroll position
 * @param {number} totalImages - Total number of images
 * @returns {Object} Texture indices {currentIndex, nextIndex, normalizedPosition}
 */
export function determineTextureIndices (position, totalImages) {
  const baseIndex = Math.floor(position % totalImages)
  const positiveBaseIndex =
    baseIndex >= 0 ? baseIndex : (totalImages + baseIndex) % totalImages

  const nextIndex = (positiveBaseIndex + 1) % totalImages

  let normalizedPosition = position % 1
  if (normalizedPosition < 0) normalizedPosition += 1

  return {
    currentIndex: positiveBaseIndex,
    nextIndex: nextIndex,
    normalizedPosition: normalizedPosition
  }
}

/**
 * Gets nearest scroll position accounting for infinite scroll
 * @param {number} targetIndex - Target project index
 * @param {number} currentPosition - Current scroll position
 * @param {number} totalImages - Total number of images
 * @returns {number} Nearest scroll position
 */
export function getNearestScrollPosition (targetIndex, currentPosition, totalImages) {
  if (!Number.isFinite(targetIndex) || !totalImages) return targetIndex

  // Determine which repetition of targetIndex is closest to currentPosition
  const baseCycle = Math.floor(currentPosition / totalImages)
  let candidate = targetIndex + baseCycle * totalImages

  const halfSpan = totalImages / 2

  if (candidate - currentPosition > halfSpan) {
    candidate -= totalImages
  } else if (currentPosition - candidate > halfSpan) {
    candidate += totalImages
  }

  return candidate
}

/**
 * Updates scroll state based on delta input
 * @param {Object} state - Current scroll state
 * @param {number} delta - Scroll delta value
 * @param {number} maxScrollIntensity - Maximum scroll intensity
 * @returns {Object} Updated scroll state
 */
export function updateScrollState (state, delta, maxScrollIntensity) {
  const wasMoving = state.isMoving

  const newState = {
    ...state,
    isStable: false,
    isMoving: true,
    targetScrollIntensity: Math.max(
      -maxScrollIntensity,
      Math.min(maxScrollIntensity, state.targetScrollIntensity + delta * 0.001)
    ),
    targetScrollPosition: state.targetScrollPosition + delta * 0.001
  }

  return { ...newState, wasMoving }
}

/**
 * Checks if scroll should settle to nearest position
 * @param {number} targetScrollIntensity - Target scroll intensity
 * @param {number} scrollStopEpsilon - Epsilon threshold
 * @returns {boolean} Whether scroll should settle
 */
export function shouldSettle (targetScrollIntensity, scrollStopEpsilon) {
  return Math.abs(targetScrollIntensity) < scrollStopEpsilon
}

/**
 * Settles scroll to nearest integer position
 * @param {number} targetScrollPosition - Current target position
 * @param {number} targetSettleSmoothness - Smoothness factor
 * @param {number} targetSnapEpsilon - Snap threshold
 * @returns {number} New target position
 */
export function settleToNearest (targetScrollPosition, targetSettleSmoothness, targetSnapEpsilon) {
  const nearestTarget = Math.round(targetScrollPosition)
  const newTarget = lerp(targetScrollPosition, nearestTarget, targetSettleSmoothness)

  if (Math.abs(newTarget - nearestTarget) < targetSnapEpsilon) {
    return nearestTarget
  }

  return newTarget
}

/**
 * Checks if scroll is stable
 * @param {number} scrollPosition - Current scroll position
 * @param {number} targetScrollPosition - Target scroll position
 * @param {number} stableThreshold - Threshold for stability
 * @param {number} targetSnapEpsilon - Target snap threshold
 * @returns {boolean} Whether scroll is stable
 */
export function isScrollStable (scrollPosition, targetScrollPosition, stableThreshold, targetSnapEpsilon) {
  const scrollDelta = Math.abs(targetScrollPosition - scrollPosition)
  const isWithinThreshold = scrollDelta < stableThreshold

  const targetSnapDistance = Math.abs(targetScrollPosition - Math.round(targetScrollPosition))
  const isTargetSnapped = targetSnapDistance < targetSnapEpsilon

  return isWithinThreshold && isTargetSnapped
}
