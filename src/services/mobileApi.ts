import { request } from './apiClient'
import { DEFAULT_APP_LINKS } from '../config/appLinks'
import { AppConfigSchema, MobileHomeSchema, parseApiResponse } from './responseSchemas'

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

export async function getMobileHome() {
  const data = await request(MOBILE_HOME_PATH)
  return parseApiResponse(MobileHomeSchema, data, '모바일 홈')
}

export async function getAppConfig() {
  const data = await request(APP_CONFIG_PATH)
  return parseApiResponse(AppConfigSchema, data, '앱 설정')
}

export function registerPushToken(payload) {
  return request(PUSH_TOKEN_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
