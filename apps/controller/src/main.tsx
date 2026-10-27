import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ControllerApp } from './App.js'
import './styles.css'

const rootElement = document.querySelector<HTMLDivElement>('#root')

if (!rootElement) {
  throw new Error('Controller root element is missing')
}

createRoot(rootElement).render(<StrictMode><ControllerApp /></StrictMode>)
