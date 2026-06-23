import { z } from 'zod'
import { CommunityCategory, MemberRole } from '../contract/enums'

const idValue = z.union([z.number(), z.string()]).nullish()
const numericValue = z.union([z.number(), z.string()]).nullish()
const looseItem = z.looseObject({})

export const MemberRoleSchema = z.enum(Object.values(MemberRole))
export const CommunityCategorySchema = z.enum(Object.values(CommunityCategory))

export const CurrentUserSchema = z.looseObject({
  id: idValue,
  studentId: idValue,
  name: z.string().nullish(),
  email: z.string().nullish(),
  role: MemberRoleSchema.nullish(),
})

export const MobileHomeSchema = z.looseObject({
  latestNotices: z.array(looseItem).nullish(),
  notices: z.array(looseItem).nullish(),
  recentPosts: z.array(looseItem).nullish(),
  posts: z.array(looseItem).nullish(),
  quickFiles: z.array(looseItem).nullish(),
  files: z.array(looseItem).nullish(),
  notifications: z.array(looseItem).nullish(),
  notificationSummary: z.looseObject({
    unreadCount: numericValue,
  }).nullish(),
  unreadCount: numericValue,
})

export const AppConfigSchema = z.looseObject({
  minimumSupportedVersion: z.string().nullish(),
  latestVersion: z.string().nullish(),
  updateUrl: z.string().nullish(),
  maintenanceMessage: z.string().nullish(),
  pushEnabled: z.boolean().nullish(),
  links: z.record(z.string(), z.string()).nullish(),
})

export const CommunityPostSchema = z.looseObject({
  id: idValue,
  title: z.string().nullish(),
  category: CommunityCategorySchema.nullish(),
})

export const CommunityPostListSchema = z.array(CommunityPostSchema)

export function parseApiResponse(schema, data, label) {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const error: any = new Error(`${label} 응답 형식이 올바르지 않습니다.`)
  error.code = 'INVALID_API_RESPONSE'
  error.status = 0
  error.cause = result.error
  throw error
}
