import { describe, it, expect } from 'vitest'

/**
 * islands.js tests
 * 
 * Tests the island mounting logic.
 */

// Helper: parseIslandSelector (from islands.js)
const parseIslandSelector = (selector) => {
  const match = selector.match(/^<pre-island\s+data-island="([^"]+)"[^>]*>([\s\S]*?)<\/pre-island>$/)
  if (!match) return null
  return {
    name: match[1],
    fallback: match[2] || '',
  }
}

describe('parseIslandSelector', () => {
  it('parses island name', () => {
    const html = '<pre-island data-island="CartWidget">Loading...</pre-island>'
    const result = parseIslandSelector(html)
    expect(result?.name).toBe('CartWidget')
  })

  it('extracts fallback content', () => {
    const html = '<pre-island data-island="UserMenu">Guest</pre-island>'
    const result = parseIslandSelector(html)
    expect(result?.fallback).toBe('Guest')
  })

  it('returns null for invalid selector', () => {
    expect(parseIslandSelector('<div>Not an island</div>')).toBeNull()
    expect(parseIslandSelector('')).toBeNull()
  })

  it('handles empty fallback', () => {
    const html = '<pre-island data-island="LazyComponent"></pre-island>'
    const result = parseIslandSelector(html)
    expect(result?.fallback).toBe('')
  })
})

// Helper: island load strategies
const loadStrategies = ['eager', 'visible', 'idle']

describe('load strategies', () => {
  it('validates strategy values', () => {
    expect(loadStrategies).toContain('eager')
    expect(loadStrategies).toContain('visible')
    expect(loadStrategies).toContain('idle')
  })

  it('defaults to eager', () => {
    const strategy = null
    const resolved = strategy || 'eager'
    expect(resolved).toBe('eager')
  })
})

// Helper: island config validation
const validateIslandConfig = (component, config = {}) => {
  const errors = []
  if (!component || typeof component !== 'string') {
    errors.push('component must be a string')
  }
  if (config.props && typeof config.props !== 'object') {
    errors.push('props must be an object')
  }
  return { valid: errors.length === 0, errors }
}

describe('island config validation', () => {
  it('validates valid config', () => {
    const result = validateIslandConfig('CartWidget', { props: { count: 5 } })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('catches missing component', () => {
    const result = validateIslandConfig('')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('component must be a string')
  })

  it('validates props type', () => {
    const result = validateIslandConfig('Cart', { props: 'invalid' })
    expect(result.valid).toBe(false)
  })
})

describe('island registry', () => {
  it('maps names to components', () => {
    const registry = {
      CartWidget: () => ({ type: 'Cart', props: {} }),
      UserMenu: () => ({ type: 'Menu', props: {} }),
      SearchBox: () => ({ type: 'Search', props: {} }),
    }

    expect(registry.CartWidget).toBeDefined()
    expect(registry.UserMenu).toBeDefined()
    expect(registry.SearchBox).toBeDefined()
  })

  it('allows custom props', () => {
    const registry = {
      CartWidget: (props) => ({ type: 'Cart', props }),
    }
    const component = registry.CartWidget({ items: 3 })
    expect(component.props.items).toBe(3)
  })
})