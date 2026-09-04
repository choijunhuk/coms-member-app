import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import App from './App'
import { ConfirmHost } from './components/ConfirmDialog'
import { configureQueryPersister, queryClient, queryPersister, shouldPersistQuery } from './services/queryClient'
import { initObservability } from './services/observability'
import { bundleVersion } from './utils/version'
import './styles.css'

void initObservability({ release: `coms-member-app@${bundleVersion()}` })
configureQueryPersister({ throttleTime: 2_000 })

const root = createRoot(document.getElementById('root'))

if (queryPersister) {
  root.render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: 24 * 60 * 60 * 1000,
          dehydrateOptions: {
            // shouldDehydrateQuery replaces (not extends) TanStack's default, which only
            // persists queries in status 'success' — without this, pending/errored queries
            // (an empty or stale-error shape) get written to disk too.
            shouldDehydrateQuery: (query) => query.state.status === 'success' && shouldPersistQuery(query),
          },
        }}
      >
        <App />
        <ConfirmHost />
      </PersistQueryClientProvider>
    </StrictMode>,
  )
} else {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <ConfirmHost />
      </QueryClientProvider>
    </StrictMode>,
  )
}
