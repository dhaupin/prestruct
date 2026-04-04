import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = document.getElementById('root')

if (root && root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>)
} else if (root) {
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}
