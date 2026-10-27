import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { TvLobbyApp } from './App.js'
import './styles.css'

const rootElement = document.querySelector<HTMLDivElement>('#root')

if (!rootElement) {
  throw new Error('TV root element is missing')
}

createRoot(rootElement).render(
  <StrictMode>
    <TvLobbyApp />
  </StrictMode>,
)
