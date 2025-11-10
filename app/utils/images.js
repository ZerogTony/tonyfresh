/**
 * Resolve when an image element has successfully loaded or been decoded.
 * Falls back to load/error events if decode() is unavailable or rejects.
 * @param {HTMLImageElement} image
 * @returns {Promise<void>}
 */
export function waitForImageReady (image) {
  if (!image) {
    return Promise.reject(new Error('waitForImageReady called without an image element'))
  }

  const resolveOnLoadEvents = () => {
    if (image.complete && image.naturalWidth !== 0) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener('load', onLoad)
        image.removeEventListener('error', onError)
      }

      function onLoad () {
        cleanup()
        resolve()
      }

      function onError (event) {
        cleanup()
        const error = event?.error instanceof Error ? event.error : new Error('Image failed to load')
        reject(error)
      }

      image.addEventListener('load', onLoad, { once: true })
      image.addEventListener('error', onError, { once: true })
    })
  }

  if (typeof image.decode === 'function') {
    try {
      return image.decode().catch(() => {
        // decode() can reject on some browsers even when the image is fine, so fall back to load events
        return resolveOnLoadEvents()
      })
    } catch (error) {
      return resolveOnLoadEvents()
    }
  }

  return resolveOnLoadEvents()
}
