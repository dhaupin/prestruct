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
