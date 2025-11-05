import React from 'react'

class ShaderBackgroundErrorBoundary extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError (error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch (error, errorInfo) {
    // Log the error to console for debugging
    console.error('[ShaderBackground] Error caught by boundary:', error, errorInfo)

    this.setState({
      error,
      errorInfo
    })

    // Fallback to solid color background
    const canvasBackground = document.querySelector('.canvas__background')
    if (canvasBackground) {
      canvasBackground.style.background = 'linear-gradient(180deg, #f8f8f8 0%, #e8e8e8 100%)'
    }

    // Set navigation background to default
    const navBackground = document.querySelector('.navigation__background')
    if (navBackground) {
      navBackground.style.background = '#f8f8f8'
      navBackground.style.opacity = '1'
      navBackground.style.visibility = 'visible'
    }
  }

  render () {
    if (this.state.hasError) {
      // Return null to not render anything - fallback CSS will handle the background
      return null
    }

    return this.props.children
  }
}

export default ShaderBackgroundErrorBoundary
