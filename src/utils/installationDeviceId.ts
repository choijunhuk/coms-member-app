import { readStoredValueAsync, writeStoredValueAsync } from './deviceStorage'

export const INSTALLATION_DEVICE_ID_KEY = 'coms.device.installation-id'

function randomId() {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  const entropy = Math.random().toString(36).slice(2, 12)
  return `${Date.now().toString(36)}-${entropy}`
}

export async function getInstallationDeviceId() {
  const existing = await readStoredValueAsync(INSTALLATION_DEVICE_ID_KEY)
  if (existing) return existing

  const generated = `install-${randomId()}`
  await writeStoredValueAsync(INSTALLATION_DEVICE_ID_KEY, generated)
  return generated
}
