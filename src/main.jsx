import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { initObservability } from './services/observability.js'
import { bundleVersion } from './utils/version.js'
import './styles.css'

void initObservability({ release: `coms-member-app@${bundleVersion()}` })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
