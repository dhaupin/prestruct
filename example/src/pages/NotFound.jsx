import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  useEffect(() => { document.title = '404 | prestruct' }, [])

  return (
    <section className="page-hero">
      <div className="container">
        <p className="page-kicker">404</p>
        <h1 className="page-heading">Route not found.</h1>
        <p className="page-sub u-mb-2">
          That path doesn't exist. The real <code>404.html</code> is generated
          by prerender.js and served by CF Pages with a genuine HTTP 404 status.
        </p>
        <Link to="/" className="btn btn-primary">Back to home</Link>
      </div>
    </section>
  )
}
