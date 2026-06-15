import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import App from './App.jsx'
import { queryClient, queryPersister } from './services/queryClient.js'
import { initObservability } from './services/observability.js'
import { bundleVersion } from './utils/version.js'
import './styles.css'

void initObservability({ release: `coms-member-app@${bundleVersion()}` })

const root = createRoot(document.getElementById('root'))

if (queryPersister) {
  root.render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister, maxAge: 24 * 60 * 60 * 1000 }}
      >
        <App />
      </PersistQueryClientProvider>
    </StrictMode>,
  )
} else {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}
