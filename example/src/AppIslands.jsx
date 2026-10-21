/**
 * src/AppIslands.jsx
 * ==================
 * Island registry -- data-pre-island name -> React component.
 * The name must match exactly what you put in the HTML attribute.
 *
 * Island components:
 *   - Run only in the browser, never during SSR prerender.
 *   - Receive no props. Read data from localStorage, fetch, or a global store.
 *   - Replace any fallback content inside the <pre-island> element.
 *
 * Strategies are chosen in the HTML, not here:
 *
 *   // eager (default) -- mounts immediately after hydration
 *   <pre-island data-pre-island="email-island" />
 *
 *   // visible -- mounts when scrolled into viewport
 *   <pre-island data-pre-island="cart-widget" data-pre-load="visible">
 *     <span className="island-loading">Loading cart...</span>
 *   </pre-island>
 *
 *   // idle -- mounts during browser idle time
 *   <pre-island data-pre-island="session-trail" data-pre-load="idle" />
 */

import EmailIsland from './components/EmailIsland.jsx'
import SessionTrail from './islands/SessionTrail.jsx'
import ScrollMarker from './islands/ScrollMarker.jsx'

export const islands = {
  'email-island': EmailIsland,
  'session-trail': SessionTrail,
  'scroll-marker': ScrollMarker,
}
