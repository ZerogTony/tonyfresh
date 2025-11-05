# Application Architecture

## Overview

This portfolio website uses an **event-driven architecture** to enable loose coupling between components. Components communicate through custom DOM events rather than direct function calls.

## Core Principles

1. **Loose Coupling**: Components don't directly reference each other
2. **Single Responsibility**: Each component manages its own state
3. **Event-Based Communication**: Global events coordinate complex interactions
4. **Unidirectional Data Flow**: Events flow from source to listeners

---

## Event-Driven Communication

### How It Works

```javascript
// Component A dispatches an event
window.dispatchEvent(new CustomEvent('projectChange', {
  detail: { projectId: 'spotify', index: 5 }
}))

// Component B listens for the event
window.addEventListener('projectChange', (event) => {
  const { projectId, index } = event.detail
  // Update UI based on project change
})
```

### Benefits

- **Testability**: Components can be tested in isolation
- **Maintainability**: Changes to one component don't cascade
- **Scalability**: New features can tap into existing events
- **Debugging**: Event flow can be logged centrally

---

## Event Catalog

### Slider Events

#### `sliderProjectChange`
Fired when the active project changes in the slider.

**Detail:**
```javascript
{
  projectIndex: number,  // Current project index
  projectId: string,     // Current project ID
  isStable: boolean      // Whether slider has settled
}
```

**Listeners:**
- ShaderBackground: Updates gradient colors
- Navigation: Highlights active project

**Example:**
```javascript
window.addEventListener('sliderProjectChange', (event) => {
  console.log(`Now viewing: ${event.detail.projectId}`)
})
```

---

#### `sliderScrollStart`
Fired when user starts scrolling the slider.

**Detail:**
```javascript
{
  direction: number,    // 1 or -1
  currentIndex: number  // Starting index
}
```

**Listeners:**
- Home page: Prevents other interactions

---

#### `sliderScrollProgress`
Fired continuously during scrolling for smooth color blending.

**Detail:**
```javascript
{
  currentIndex: number,  // Current texture index
  nextIndex: number,     // Next texture index
  currentId: string,     // Current project ID
  nextId: string,        // Next project ID
  t: number              // Progress between projects (0-1)
}
```

**Listeners:**
- ShaderBackground: Blends colors smoothly

**Throttling:** Only emitted when progress changes by > 0.01

---

#### `sliderSettled`
Fired when slider comes to rest on a project.

**Detail:**
```javascript
{
  projectIndex: number,
  projectId: string
}
```

**Listeners:**
- Analytics: Track which projects users view

---

#### `sliderTransitionStart`
Fired when slider begins transitioning to case page.

**Detail:**
```javascript
{
  projectId: string,
  direction: 'forward' | 'reverse'
}
```

**Listeners:**
- App: Locks scroll during transition
- ShaderBackground: Freezes color

---

#### `sliderTransitionComplete`
Fired when slider transition to case page completes.

**Detail:**
```javascript
{
  projectId: string,
  direction: 'forward' | 'reverse'
}
```

**Listeners:**
- App: Unlocks scroll
- Case page: Begins page animation

---

### Navigation Events

#### `requestNavigation`
Fired when a component wants to navigate to a different page.

**Detail:**
```javascript
{
  url: string  // Target URL
}
```

**Listeners:**
- App: Handles page transition

**Example:**
```javascript
// From Case page "Back to Work" button
window.dispatchEvent(new CustomEvent('requestNavigation', {
  detail: { url: '/home' }
}))
```

---

### Scroll Events

#### `lockScroll`
Fired when scroll should be disabled.

**Detail:** None

**Listeners:**
- App: Disables scroll and pointer events

---

#### `unlockScroll`
Fired when scroll should be re-enabled.

**Detail:** None

**Listeners:**
- App: Restores scroll and pointer events

---

### Shader Events

#### `shaderOverride`
Fired when shader background should display a specific color.

**Detail:**
```javascript
{
  colors: {
    color1: string,  // Hex color
    color2: string,  // Hex color
    color3: string   // Hex color
  },
  immediate: boolean  // Skip animation
}
```

**Listeners:**
- ShaderBackground: Overrides gradient with solid colors

**Use Case:** Case pages set background to match project color

---

#### `shaderOverrideClear`
Fired when shader should return to gradient mode.

**Detail:** None

**Listeners:**
- ShaderBackground: Resumes normal gradient blending

---

## Component Relationships

```
┌─────────────┐
│     App     │ (Orchestrator)
└──────┬──────┘
       │
       ├─ Listens: requestNavigation, lockScroll, unlockScroll
       └─ Manages: Page transitions, scroll state

┌──────────────┐
│ ThreeSlider  │ (Producer)
└──────┬───────┘
       │
       ├─ Dispatches: sliderProjectChange, sliderScrollStart,
       │              sliderScrollProgress, sliderSettled,
       │              sliderTransitionStart, sliderTransitionComplete
       └─ Manages: 3D slider state, transitions

┌───────────────────┐
│ ShaderBackground  │ (Consumer)
└──────┬────────────┘
       │
       ├─ Listens: sliderProjectChange, sliderScrollProgress,
       │           shaderOverride, shaderOverrideClear
       └─ Manages: Gradient colors

┌──────────────┐
│  Case Page   │ (Producer & Consumer)
└──────┬───────┘
       │
       ├─ Listens: sliderTransitionComplete
       ├─ Dispatches: shaderOverride, shaderOverrideClear,
       │              requestNavigation
       └─ Manages: Case content, project-specific background
```

---

## Event Flow Examples

### Example 1: User Scrolls Slider

```
1. User scrolls mouse wheel
   ↓
2. ThreeSlider.onWheel() updates scroll state
   ↓
3. ThreeSlider.update() calculates new position
   ↓
4. ThreeSlider dispatches sliderScrollProgress
   ↓
5. ShaderBackground receives event
   ↓
6. ShaderBackground blends colors based on progress
   ↓
7. User stops scrolling
   ↓
8. ThreeSlider settles to nearest project
   ↓
9. ThreeSlider dispatches sliderProjectChange
   ↓
10. ShaderBackground snaps to final color
```

### Example 2: Navigate from Slider to Case Page

```
1. User clicks project in slider
   ↓
2. ThreeSlider.onProjectClick() called
   ↓
3. ThreeSlider dispatches lockScroll
   ↓
4. App locks scroll
   ↓
5. ThreeSlider dispatches sliderTransitionStart
   ↓
6. ThreeSlider animates plane to case position
   ↓
7. ThreeSlider dispatches sliderTransitionComplete
   ↓
8. ThreeSlider dispatches requestNavigation
   ↓
9. App.onChange() transitions to case page
   ↓
10. Case page dispatches shaderOverride
    ↓
11. ShaderBackground shows project color
    ↓
12. Case page animation begins
```

### Example 3: Return from Case Page to Home

```
1. User clicks "Back to Work"
   ↓
2. Case.onBackToWorkClick() called
   ↓
3. Case dispatches lockScroll
   ↓
4. Case scrolls to top
   ↓
5. Case starts exit animation
   ↓
6. ThreeSlider starts reverse transition
   ↓
7. Case dispatches shaderOverrideClear
   ↓
8. ShaderBackground resumes gradient
   ↓
9. Case dispatches requestNavigation('/home')
   ↓
10. App.onChange() transitions to home page
    ↓
11. Home page shows
    ↓
12. App dispatches unlockScroll
```

---

## Best Practices

### 1. Event Naming Convention

Use descriptive, namespaced names:
```javascript
// Good
'sliderProjectChange'
'shaderOverrideClear'

// Bad
'change'
'update'
```

### 2. Event Detail Structure

Always include relevant context:
```javascript
// Good
window.dispatchEvent(new CustomEvent('projectChange', {
  detail: {
    projectIndex: 5,
    projectId: 'spotify',
    isStable: true
  }
}))

// Bad
window.dispatchEvent(new CustomEvent('projectChange', {
  detail: 'spotify'
}))
```

### 3. Listener Cleanup

Remove listeners when components are destroyed:
```javascript
class Component {
  constructor() {
    this.onProjectChange = this.onProjectChange.bind(this)
    window.addEventListener('sliderProjectChange', this.onProjectChange)
  }

  destroy() {
    window.removeEventListener('sliderProjectChange', this.onProjectChange)
  }
}
```

### 4. Avoid Event Storms

Throttle high-frequency events:
```javascript
import { createThrottledEmitter } from 'components/ThreeSlider/modules/events'

this.emitScrollProgress = createThrottledEmitter(
  dispatchScrollProgress,
  0.01 // Only emit when change > 1%
)
```

### 5. Document Events

Always document custom events with:
- Event name
- When it fires
- Detail structure
- Who listens
- Example usage

---

## Debugging Events

### Log All Events

```javascript
// In development, log all custom events
if (IS_DEVELOPMENT) {
  const originalDispatch = window.dispatchEvent
  window.dispatchEvent = function(event) {
    if (event instanceof CustomEvent) {
      console.log(`[Event] ${event.type}`, event.detail)
    }
    return originalDispatch.call(this, event)
  }
}
```

### Monitor Specific Events

```javascript
window.addEventListener('sliderProjectChange', (event) => {
  console.log('Project changed:', event.detail)
}, { passive: true })
```

---

## Testing Events

### Unit Testing Event Dispatch

```javascript
test('dispatches project change event', () => {
  const handler = jest.fn()
  window.addEventListener('sliderProjectChange', handler)

  slider.changeProject(5)

  expect(handler).toHaveBeenCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        projectIndex: 5
      })
    })
  )
})
```

### Integration Testing Event Flow

```javascript
test('slider to case transition', async () => {
  const events = []
  const captureEvent = (e) => events.push(e.type)

  window.addEventListener('lockScroll', captureEvent)
  window.addEventListener('sliderTransitionStart', captureEvent)
  window.addEventListener('requestNavigation', captureEvent)

  await slider.onProjectClick('spotify')

  expect(events).toEqual([
    'lockScroll',
    'sliderTransitionStart',
    'requestNavigation'
  ])
})
```

---

## Future Improvements

1. **Type Safety**: Use TypeScript for event detail types
2. **Event Bus**: Create centralized event emitter with type checking
3. **Event Replay**: Record and replay events for debugging
4. **Performance**: Monitor event listener count and cleanup
5. **Documentation**: Auto-generate event docs from code
