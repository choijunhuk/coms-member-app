import { request } from './apiClient.js'
import { DEFAULT_APP_LINKS } from '../config/appLinks.js'

export const MOBILE_HOME_PATH = '/api/mobile/v1/home'
export const APP_CONFIG_PATH = '/api/mobile/v1/app-config'
export const PUSH_TOKEN_PATH = '/api/mobile/v1/push-tokens'

export const DEFAULT_APP_CONFIG = {
  minimumSupportedVersion: '0.1.0',
  latestVersion: '0.1.0',
  updateUrl: DEFAULT_APP_LINKS.update,
  maintenanceMessage: '',
  pushEnabled: true,
  links: DEFAULT_APP_LINKS,
}

export function isRecoverableMobileApiError(error) {
  return error?.status === 404 || error?.status === 501
}

export function getMobileHome() {
  return request(MOBILE_HOME_PATH)
}

export function getAppConfig() {
  return request(APP_CONFIG_PATH)
}

export function registerPushToken(payload) {
  return request(PUSH_TOKEN_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
