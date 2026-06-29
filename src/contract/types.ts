import type { z } from 'zod'
import type {
  AppConfigSchema,
  AppSchema,
  ClubActivitySchema,
  CommunityPostSchema,
  CurrentUserSchema,
  FileSchema,
  NoticeSchema,
  NotificationSchema,
} from '../services/responseSchemas'

// Shared domain types inferred from the zod response schemas in
// services/responseSchemas.ts so screen props track the validation source of
// truth. The schemas use z.looseObject, so each type carries an index
// signature for the many defensively-accessed fields the backend also returns
// (e.g. commentCount, imageUrls) that are not part of the declared shape.

export type CurrentUser = z.infer<typeof CurrentUserSchema>
export type Notice = z.infer<typeof NoticeSchema>
export type CommunityPost = z.infer<typeof CommunityPostSchema>
export type ArchiveFile = z.infer<typeof FileSchema>
export type ClubActivity = z.infer<typeof ClubActivitySchema>
export type AppItem = z.infer<typeof AppSchema>
export type AppConfig = z.infer<typeof AppConfigSchema>
export type NotificationItem = z.infer<typeof NotificationSchema>

// App links is a record of label -> url; AppConfig.links is the same shape.
export type AppLinks = Record<string, string>
