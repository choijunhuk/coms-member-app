import { z } from 'zod/mini'
import { CommunityCategory, MemberRole } from '../contract/enums'
import type { ApiError } from './apiClient'

const idValue = z.nullish(z.union([z.number(), z.string()]))
const numericValue = z.nullish(z.union([z.number(), z.string()]))
const looseItem = z.looseObject({})

export const MemberRoleSchema = z.enum(Object.values(MemberRole))
export const CommunityCategorySchema = z.enum(Object.values(CommunityCategory))

export const CurrentUserSchema = z.looseObject({
  id: idValue,
  studentId: idValue,
  name: z.nullish(z.string()),
  email: z.nullish(z.string()),
  role: z.nullish(MemberRoleSchema),
  generation: numericValue,
})

export const MobileHomeSchema = z.looseObject({
  latestNotices: z.nullish(z.array(looseItem)),
  notices: z.nullish(z.array(looseItem)),
  recentPosts: z.nullish(z.array(looseItem)),
  posts: z.nullish(z.array(looseItem)),
  quickFiles: z.nullish(z.array(looseItem)),
  files: z.nullish(z.array(looseItem)),
  notifications: z.nullish(z.array(looseItem)),
  notificationSummary: z.nullish(z.looseObject({
    unreadCount: numericValue,
  })),
  unreadCount: numericValue,
})

export const AppConfigSchema = z.looseObject({
  minimumSupportedVersion: z.nullish(z.string()),
  latestVersion: z.nullish(z.string()),
  updateUrl: z.nullish(z.string()),
  maintenanceMessage: z.nullish(z.string()),
  pushEnabled: z.nullish(z.boolean()),
  links: z.nullish(z.record(z.string(), z.string())),
})

export const CommunityPostSchema = z.looseObject({
  id: idValue,
  title: z.nullish(z.string()),
  category: z.nullish(CommunityCategorySchema),
  bookmarked: z.nullish(z.boolean()),
  content: z.nullish(z.string()),
  createdAt: z.nullish(z.string()),
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
  name: z.nullish(z.string()),
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
  action: z.nullish(z.string()),
  actorName: z.nullish(z.string()),
  actorStudentId: idValue,
  createdAt: z.nullish(z.string()),
  targetType: z.nullish(z.string()),
  targetId: idValue,
})
export const AuditLogListSchema = z.union([z.array(AuditLogSchema), z.looseObject({})])

// --- app catalog ---

export const AppSchema = z.looseObject({
  id: idValue,
  title: z.nullish(z.string()),
  eyebrow: z.nullish(z.string()),
  body: z.nullish(z.string()),
  href: z.nullish(z.string()),
  sortOrder: numericValue,
})
export const AppListSchema = z.array(AppSchema)

export const ClubProjectSchema = z.looseObject({
  id: idValue,
  title: z.nullish(z.string()),
  description: z.nullish(z.string()),
  eyebrow: z.nullish(z.string()),
  madeBy: z.nullish(z.string()),
  linkUrl: z.nullish(z.string()),
  displayUrl: z.nullish(z.string()),
  category: z.nullish(z.string()),
  categoryName: z.nullish(z.string()),
  files: z.nullish(z.array(z.looseObject({ id: idValue, url: z.nullish(z.string()), originalName: z.nullish(z.string()) }))),
})
export const ClubProjectListSchema = z.array(ClubProjectSchema)

// --- archive ---

export const FileSchema = z.looseObject({
  id: idValue,
  title: z.nullish(z.string()),
  category: z.nullish(z.string()),
  originalName: z.nullish(z.string()),
  description: z.nullish(z.string()),
  uploadedAt: z.nullish(z.string()),
  viewCount: numericValue,
  myVote: numericValue,
  upvotes: numericValue,
})
export const FileListSchema = z.array(FileSchema)

// --- club activity ---

export const ClubActivitySchema = z.looseObject({
  id: idValue,
  kind: z.nullish(z.string()),
  category: z.nullish(z.string()),
  title: z.nullish(z.string()),
  description: z.nullish(z.string()),
  eventDate: z.nullish(z.string()),
})
export const ClubActivityListSchema = z.array(ClubActivitySchema)

// Recurring 정기 일정, already expanded into one entry per occurrence by the
// server for the requested month.
export const ScheduleOccurrenceSchema = z.looseObject({
  date: z.nullish(z.string()),
  recurringScheduleId: idValue,
  title: z.nullish(z.string()),
  startTime: z.nullish(z.string()),
  endTime: z.nullish(z.string()),
  location: z.nullish(z.string()),
  canceled: z.nullish(z.boolean()),
})
export const ScheduleOccurrenceListSchema = z.array(ScheduleOccurrenceSchema)

// --- notices ---

export const NoticeSchema = z.looseObject({
  id: idValue,
  title: z.nullish(z.string()),
  content: z.nullish(z.string()),
  pinned: z.nullish(z.boolean()),
  category: z.nullish(z.string()),
  createdAt: z.nullish(z.string()),
  viewCount: numericValue,
  upvotes: numericValue,
})
export const NoticeListSchema = z.array(NoticeSchema)

// --- notifications ---

export const NotificationSummarySchema = z.looseObject({
  unreadCount: numericValue,
})

export const NotificationPreferencesSchema = z.looseObject({
  commentOnPost: z.nullish(z.boolean()),
  replyOnComment: z.nullish(z.boolean()),
  noticeCreated: z.nullish(z.boolean()),
  externalInvite: z.nullish(z.boolean()),
  communityPostRestored: z.nullish(z.boolean()),
  communityPostDeleted: z.nullish(z.boolean()),
  recruitApplication: z.nullish(z.boolean()),
})

export const NotificationSchema = z.looseObject({
  id: idValue,
  read: z.nullish(z.boolean()),
  message: z.nullish(z.string()),
  actorLabel: z.nullish(z.string()),
  type: z.nullish(z.string()),
  createdAt: z.nullish(z.string()),
  acceptUrl: z.nullish(z.string()),
})
export const NotificationListSchema = z.array(NotificationSchema)

// --- public sponsors ---

export const SponsorSchema = z.looseObject({
  // Anonymous sponsors deliberately have no public database identifier.
  id: z.nullable(z.number()),
  name: z.nullish(z.string()),
  tierId: z.nullish(z.number()),
  logoUrl: z.nullish(z.string()),
  linkUrl: z.nullish(z.string()),
  description: z.nullish(z.string()),
  sinceDate: z.nullish(z.string()),
  untilDate: z.nullish(z.string()),
  anonymous: z.nullish(z.boolean()),
})

export const SponsorTierSchema = z.looseObject({
  // The backend groups sponsors with no tier into a trailing untiered group with id null.
  id: z.nullable(z.number()),
  name: z.nullish(z.string()),
  color: z.nullish(z.string()),
  description: z.nullish(z.string()),
  sortOrder: z.nullish(z.number()),
  sponsors: z.array(SponsorSchema),
})
export const SponsorTierListSchema = z.array(SponsorTierSchema)

export const SponsorHowToSectionSchema = z.looseObject({
  title: z.nullish(z.string()),
  bodyHtml: z.nullish(z.string()),
  contactEmail: z.nullish(z.string()),
  contactLink: z.nullish(z.string()),
  bankNote: z.nullish(z.string()),
})

export const SponsorPageSettingsSchema = z.looseObject({
  heroTitle: z.nullish(z.string()),
  heroSubtitle: z.nullish(z.string()),
  bannerImageId: z.nullish(z.number()),
  introHtml: z.nullish(z.string()),
  accentColor: z.nullish(z.string()),
  layout: z.nullish(z.string()),
  showTierLabels: z.nullish(z.boolean()),
  thankYouMessage: z.nullish(z.string()),
  howToSection: z.nullish(SponsorHowToSectionSchema),
  showCounts: z.nullish(z.boolean()),
})

export const SponsorPageResponseSchema = z.looseObject({
  settings: SponsorPageSettingsSchema,
  bannerImageUrl: z.nullish(z.string()),
  sponsorCount: z.nullish(z.number()),
  tierCount: z.nullish(z.number()),
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
