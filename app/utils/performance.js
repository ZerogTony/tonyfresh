/**
 * Performance monitoring utilities
 * Tracks Core Web Vitals and custom metrics
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals'

/**
 * Logs metric to console in development
 * @param {Object} metric - Web Vitals metric
 */
function logMetric (metric) {
  if (IS_DEVELOPMENT) {
    console.log(`[Performance] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta
    })
  }
}

/**
 * Sends metric to analytics (placeholder for your analytics service)
 * @param {Object} metric - Web Vitals metric
 */
function sendToAnalytics (metric) {
  // Example: Send to Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true
    })
  }

  // Example: Send to custom analytics endpoint
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType
    })

    // Uncomment and replace with your analytics endpoint
    // navigator.sendBeacon('/api/analytics/vitals', body)
  }
}

/**
 * Reports a web vital metric
 * @param {Object} metric - Web Vitals metric
 */
function reportMetric (metric) {
  logMetric(metric)
  // Uncomment to send to analytics
  // sendToAnalytics(metric)
}

/**
 * Initializes performance monitoring
 * Tracks all Core Web Vitals metrics
 */
export function initPerformanceMonitoring () {
  // Only run in browser
  if (typeof window === 'undefined') return

  // Core Web Vitals
  onCLS(reportMetric)  // Cumulative Layout Shift
  onFCP(reportMetric)  // First Contentful Paint
  onLCP(reportMetric)  // Largest Contentful Paint
  onTTFB(reportMetric) // Time to First Byte
  onINP(reportMetric)  // Interaction to Next Paint (replaces FID)

  if (IS_DEVELOPMENT) {
    console.log('[Performance] Monitoring initialized for Core Web Vitals')
  }
}

/**
 * Measures custom performance metric
 * @param {string} name - Metric name
 * @param {Function} fn - Function to measure
 * @returns {Promise<any>} Result of the function
 */
export async function measureAsync (name, fn) {
  const startTime = performance.now()

  try {
    const result = await fn()
    const duration = performance.now() - startTime

    if (IS_DEVELOPMENT) {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
    }

    // Send custom metric to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'timing_complete', {
        name,
        value: Math.round(duration),
        event_category: 'Custom Performance'
      })
    }

    return result
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, error)
    throw error
  }
}

/**
 * Marks a custom performance entry
 * @param {string} name - Mark name
 */
export function mark (name) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name)
  }
}

/**
 * Measures between two marks
 * @param {string} name - Measure name
 * @param {string} startMark - Start mark name
 * @param {string} endMark - End mark name
 */
export function measure (name, startMark, endMark) {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark)

      const measures = performance.getEntriesByName(name, 'measure')
      if (measures.length > 0 && IS_DEVELOPMENT) {
        console.log(`[Performance] ${name}: ${measures[0].duration.toFixed(2)}ms`)
      }
    } catch (error) {
      console.warn(`[Performance] Could not measure ${name}:`, error)
    }
  }
}

/**
 * Gets performance metrics summary
 * @returns {Object} Performance summary
 */
export function getPerformanceSummary () {
  if (typeof performance === 'undefined') return null

  const navigation = performance.getEntriesByType('navigation')[0]
  const paint = performance.getEntriesByType('paint')

  return {
    navigation: navigation ? {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      domInteractive: navigation.domInteractive,
      domComplete: navigation.domComplete
    } : null,
    paint: {
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
    },
    memory: performance.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    } : null
  }
}
