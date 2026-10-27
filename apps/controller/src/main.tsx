import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const rootElement = document.querySelector<HTMLDivElement>('#root')

if (!rootElement) {
  throw new Error('Controller root element is missing')
}

createRoot(rootElement).render(<StrictMode />)
