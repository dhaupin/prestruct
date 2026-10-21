/**
 * src/App.jsx
 * ===========
 * TEMPLATE FILE -- wire your AppLayout here, keep BrowserRouter in this file only.
 *
 * BrowserRouter must NOT be imported in AppLayout.jsx or any file it imports.
 * If it is, ssrLoadModule will initialize BrowserRouter against window.location
 * (which defaults to '/' in Node), and every route will prerender as the
 * homepage with no error message. See AGENTS.md for the full explanation.
 */

import * as rrdNS from 'react-router-dom'
// Neither plain named imports nor a bare namespace destructure survive
// both majors (see AppLayout.jsx). Destructure from whichever side of
// the interop carries the exports object.
const rrd = rrdNS.default ?? rrdNS
const { BrowserRouter } = rrd

import AppLayout from './AppLayout.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
