import { z } from 'zod'
import { CommunityCategory, MemberRole } from '../contract/enums'
import type { ApiError } from './apiClient'

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
  generation: numericValue,
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
  content: z.string().nullish(),
  createdAt: z.string().nullish(),
  commentCount: numericValue,
  viewCount: numericValue,
  upvotes: numericValue,
  downvotes: numericValue,
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

export const ClubProjectSchema = z.looseObject({
  id: idValue,
  title: z.string().nullish(),
  description: z.string().nullish(),
  eyebrow: z.string().nullish(),
  madeBy: z.string().nullish(),
  linkUrl: z.string().nullish(),
  displayUrl: z.string().nullish(),
  category: z.string().nullish(),
  categoryName: z.string().nullish(),
  files: z.array(z.looseObject({ id: idValue, url: z.string().nullish(), originalName: z.string().nullish() })).nullish(),
})
export const ClubProjectListSchema = z.array(ClubProjectSchema)

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

// Recurring 정기 일정, already expanded into one entry per occurrence by the
// server for the requested month.
export const ScheduleOccurrenceSchema = z.looseObject({
  date: z.string().nullish(),
  recurringScheduleId: idValue,
  title: z.string().nullish(),
  startTime: z.string().nullish(),
  endTime: z.string().nullish(),
  location: z.string().nullish(),
  canceled: z.boolean().nullish(),
})
export const ScheduleOccurrenceListSchema = z.array(ScheduleOccurrenceSchema)

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

export const NotificationPreferencesSchema = z.looseObject({
  commentOnPost: z.boolean().nullish(),
  replyOnComment: z.boolean().nullish(),
  noticeCreated: z.boolean().nullish(),
  externalInvite: z.boolean().nullish(),
  communityPostRestored: z.boolean().nullish(),
  communityPostDeleted: z.boolean().nullish(),
  recruitApplication: z.boolean().nullish(),
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

// --- public sponsors ---

export const SponsorSchema = z.looseObject({
  // Anonymous sponsors deliberately have no public database identifier.
  id: z.number().nullable(),
  name: z.string().nullish(),
  tierId: z.number().nullish(),
  logoUrl: z.string().nullish(),
  linkUrl: z.string().nullish(),
  description: z.string().nullish(),
  sinceDate: z.string().nullish(),
  untilDate: z.string().nullish(),
  anonymous: z.boolean().nullish(),
})

export const SponsorTierSchema = z.looseObject({
  id: z.number(),
  name: z.string().nullish(),
  color: z.string().nullish(),
  description: z.string().nullish(),
  sortOrder: z.number().nullish(),
  sponsors: z.array(SponsorSchema),
})
export const SponsorTierListSchema = z.array(SponsorTierSchema)

export const SponsorHowToSectionSchema = z.looseObject({
  title: z.string().nullish(),
  bodyHtml: z.string().nullish(),
  contactEmail: z.string().nullish(),
  contactLink: z.string().nullish(),
  bankNote: z.string().nullish(),
})

export const SponsorPageSettingsSchema = z.looseObject({
  heroTitle: z.string().nullish(),
  heroSubtitle: z.string().nullish(),
  bannerImageId: z.number().nullish(),
  introHtml: z.string().nullish(),
  accentColor: z.string().nullish(),
  layout: z.string().nullish(),
  showTierLabels: z.boolean().nullish(),
  thankYouMessage: z.string().nullish(),
  howToSection: SponsorHowToSectionSchema.nullish(),
  showCounts: z.boolean().nullish(),
})

export const SponsorPageResponseSchema = z.looseObject({
  settings: SponsorPageSettingsSchema,
  bannerImageUrl: z.string().nullish(),
  sponsorCount: z.number().nullish(),
  tierCount: z.number().nullish(),
})

export type Sponsor = z.infer<typeof SponsorSchema>
export type SponsorTier = z.infer<typeof SponsorTierSchema>
export type SponsorPageResponse = z.infer<typeof SponsorPageResponseSchema>

export type InvalidApiResponseError = ApiError & { data?: unknown }

// Salvage a usable value out of an INVALID_API_RESPONSE by dropping ONLY the
// top-level fields zod rejected and re-validating the rest. Lets a caller
// degrade on contract drift (an unknown enum member, say) instead of treating
// a client-side validation failure as a server/auth failure.
// Returns null when the payload cannot be salvaged — no object to work with,
// a nested/whole-object failure, or still invalid once the bad fields are
// gone — so callers keep their hard-failure path for genuinely broken data.
export function degradeInvalidApiResponse(schema, error) {
  const invalid: InvalidApiResponseError = error
  if (invalid?.code !== 'INVALID_API_RESPONSE') return null
  const data = invalid.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null

  const issues = (invalid.cause as { issues?: Array<{ path?: Array<PropertyKey> }> })?.issues
  if (!Array.isArray(issues) || issues.length === 0) return null

  const salvaged = { ...(data as Record<string, unknown>) }
  for (const issue of issues) {
    const path = issue?.path
    // Exactly one path segment = a top-level field we can drop. A deeper path
    // or an empty one means the failure is structural, not a stray field.
    if (path?.length !== 1 || typeof path[0] !== 'string') return null
    delete salvaged[path[0]]
  }

  const result = schema.safeParse(salvaged)
  return result.success ? result.data : null
}

export function parseApiResponse(schema, data, label) {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const error: InvalidApiResponseError = new Error(`${label} 응답 형식이 올바르지 않습니다.`)
  error.code = 'INVALID_API_RESPONSE'
  error.status = 0
  error.cause = result.error
  // Keep the raw payload on the error so callers that can degrade gracefully
  // (e.g. session restore on enum drift) still have the server's data.
  error.data = data
  throw error
}
