import { useLayoutEffect, useRef } from 'react'

/**
 * ScrollMarker island
 * ===================
 * Demo island for the `visible` load strategy. Mounts only when its
 * <pre-island> element scrolls into the viewport (IntersectionObserver in
 * engine/src/islands.js). It records the fact that it mounted, so the
 * /islands page can prove the strategy fired on scroll rather than on load.
 *
 * Read the mounting context from the host element: engine islands render
 * into the <pre-island> node itself, so a component can reach its parent
 * via a DOM ref and read data-pre-* attributes that the page set.
 */
export default function ScrollMarker() {
  const ref = useRef(null)

  useLayoutEffect(() => {
    // Find the <pre-island> that hosts us (we were rendered directly into it).
    const host = ref.current?.closest?.('pre-island')
    if (host) {
      host.dataset.islandMounted = 'visible'
      host.setAttribute('data-island-mounted-at', String(Date.now()))
    }
  }, [])

  return (
    <div className="callout island-fallback" style={{ margin: 0 }}>
      <p ref={ref} style={{ margin: 0 }}>
        <strong>visible island mounted.</strong> This component only ran after the
        browser scrolled it into view (IntersectionObserver threshold 0.1). Before
        that, prerendered HTML shipped the placeholder text below as the fallback.
      </p>
    </div>
  )
}
