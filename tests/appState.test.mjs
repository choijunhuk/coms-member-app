import assert from 'node:assert/strict'
import { sponsorsBackTarget } from '../src/hooks/useAppState.ts'

// Sponsors can be opened from the Home tab card or from Settings; back
// (hardware or in-screen) must return to whichever one opened it.
assert.equal(sponsorsBackTarget('home'), 'home')
assert.equal(sponsorsBackTarget('settings'), 'settings')
assert.equal(sponsorsBackTarget(undefined), 'settings')

console.log('app state contract passed')
