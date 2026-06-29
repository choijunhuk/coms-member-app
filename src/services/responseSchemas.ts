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
  bookmarked: z.boolean().nullish(),
})

export const CommunityPostListSchema = z.array(CommunityPostSchema)

// --- admin ---

export const EligibleMemberSchema = z.looseObject({
  id: idValue,
  studentId: idValue,
  name: z.string().nullish(),
  generation: numericValue,
})
export const EligibleMemberListSchema = z.union([z.array(EligibleMemberSchema), z.looseObject({})])

export const MemberSchema = z.looseObject({
  id: idValue,
  studentId: idValue,
})
export const MemberListSchema = z.union([z.array(MemberSchema), z.looseObject({})])

export const AuditLogSchema = z.looseObject({
  id: idValue,
  action: z.string().nullish(),
  actorName: z.string().nullish(),
  actorStudentId: idValue,
  createdAt: z.string().nullish(),
  targetType: z.string().nullish(),
  targetId: idValue,
})
export const AuditLogListSchema = z.union([z.array(AuditLogSchema), z.looseObject({})])

// --- app catalog ---

export const AppSchema = z.looseObject({
  id: idValue,
  title: z.string().nullish(),
  eyebrow: z.string().nullish(),
  body: z.string().nullish(),
  href: z.string().nullish(),
  sortOrder: numericValue,
})
export const AppListSchema = z.array(AppSchema)

// --- archive ---

export const FileSchema = z.looseObject({
  id: idValue,
  title: z.string().nullish(),
  category: z.string().nullish(),
  originalName: z.string().nullish(),
  description: z.string().nullish(),
  uploadedAt: z.string().nullish(),
  viewCount: numericValue,
  myVote: numericValue,
  upvotes: numericValue,
})
export const FileListSchema = z.array(FileSchema)

// --- club activity ---

export const ClubActivitySchema = z.looseObject({
  id: idValue,
  kind: z.string().nullish(),
  category: z.string().nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  eventDate: z.string().nullish(),
})
export const ClubActivityListSchema = z.array(ClubActivitySchema)

// --- notices ---

export const NoticeSchema = z.looseObject({
  id: idValue,
  title: z.string().nullish(),
  content: z.string().nullish(),
  pinned: z.boolean().nullish(),
  category: z.string().nullish(),
  createdAt: z.string().nullish(),
  viewCount: numericValue,
  upvotes: numericValue,
})
export const NoticeListSchema = z.array(NoticeSchema)

// --- notifications ---

export const NotificationSummarySchema = z.looseObject({
  unreadCount: numericValue,
})

export const NotificationSchema = z.looseObject({
  id: idValue,
  read: z.boolean().nullish(),
  message: z.string().nullish(),
  actorLabel: z.string().nullish(),
  type: z.string().nullish(),
  createdAt: z.string().nullish(),
  acceptUrl: z.string().nullish(),
})
export const NotificationListSchema = z.array(NotificationSchema)

export function parseApiResponse(schema, data, label) {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const error: any = new Error(`${label} 응답 형식이 올바르지 않습니다.`)
  error.code = 'INVALID_API_RESPONSE'
  error.status = 0
  error.cause = result.error
  throw error
}
