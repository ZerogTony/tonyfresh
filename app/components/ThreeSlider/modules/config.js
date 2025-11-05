/**
 * Configuration and constants for ThreeSlider
 * Contains smoothing values, thresholds, and device-specific settings
 */

/**
 * Get smoothing values based on device type
 * @param {boolean} isMobile - Whether the device is mobile
 * @returns {Object} Smoothing configuration object
 */
export function getSmoothingValues (isMobile) {
  return {
    scrollSmoothness: isMobile ? 0.7 : 0.6,
    scrollPositionSmoothness: isMobile ? 0.12 : 0.09,
    settleSmoothness: isMobile ? 0.14 : 0.12,
    scrollDamping: isMobile ? 0.9 : 0.92,
    scrollStopEpsilon: isMobile ? 0.0012 : 0.001,
    stableThreshold: isMobile ? 0.016 : 0.014,
    targetSettleSmoothness: isMobile ? 0.26 : 0.22,
    targetSnapEpsilon: isMobile ? 0.0015 : 0.0012
  }
}

/**
 * Calculate home offset ratio based on viewport width
 * @param {number} width - Viewport width
 * @returns {number} Offset ratio
 */
export function calculateHomeOffsetRatio (width) {
  if (width <= 1024) return 0.04
  if (width <= 1200) return 0.05
  if (width <= 1600) return 0.055
  if (width <= 1920) return 0.07
  return 0.08
}

/**
 * Get base scale for home view based on device and viewport
 * @param {boolean} isMobile - Whether the device is mobile
 * @param {number} width - Viewport width
 * @returns {number} Base scale value
 */
export function getHomeBaseScale (isMobile, width) {
  if (isMobile) return 0.65

  if (width >= 1920) return 0.4
  if (width >= 1440) return 0.42
  if (width >= 1280) return 0.38
  return 0.36
}

/**
 * Calculate plane dimensions based on viewport
 * @param {Object} camera - Three.js camera
 * @param {number} viewportWidth - Viewport width in pixels
 * @returns {Object} Plane dimensions {width, height}
 */
export function calculatePlaneDimensions (camera, viewportWidth) {
  const fov = camera.fov * (Math.PI / 180)
  const viewportHeight = 2 * Math.tan(fov / 2) * camera.position.z
  const viewportWidthWorld = viewportHeight * camera.aspect

  const viewportWidthThresholdLarge = 1440
  const viewportWidthThresholdMedium = 1200

  let widthFactor = 0.6

  if (viewportWidth < 900) {
    widthFactor = 0.9
  } else if (viewportWidth < viewportWidthThresholdMedium) {
    widthFactor = 0.7
  } else if (viewportWidth >= viewportWidthThresholdLarge) {
    widthFactor = 0.64
  }

  const planeWidth = viewportWidthWorld * widthFactor
  const planeHeight = planeWidth * (9 / 16)

  return { width: planeWidth, height: planeHeight }
}
