import { plainText, preview } from './format'

function mediaInfoById(items, id) {
  return Array.isArray(items) ? items.find((item) => Number(item?.id) === Number(id)) : null
}

function hasInlineImageBlock(blocks, imageUrl) {
  return Boolean(imageUrl) && blocks.some((block) => block.type === 'image' && block.url === imageUrl)
}

function looksLikeBlockJson(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return false
  return (trimmed.startsWith('[') || trimmed.startsWith('{')) && /"type"\s*:/.test(trimmed)
}

function looksLikeQuotedBlockJson(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed.startsWith('"')) return false
  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === 'string' && looksLikeBlockJson(parsed)
  } catch {
    return false
  }
}

function parseContentBlocks(value, depth = 0) {
  if (value == null || depth > 4) return null
  if (Array.isArray(value)) return value
  if (typeof value === 'object') {
    if (Array.isArray(value.blocks)) return value.blocks
    if (value.type) return [value]
    return null
  }
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!looksLikeBlockJson(trimmed) && !looksLikeQuotedBlockJson(trimmed)) return null
  try {
    return parseContentBlocks(JSON.parse(trimmed), depth + 1)
  } catch {
    return null
  }
}

function withLegacyImage(post, blocks) {
  if (!post?.imageUrl || hasInlineImageBlock(blocks, post.imageUrl)) return blocks
  return [
    ...blocks,
    {
      type: 'image',
      legacy: true,
      name: post.imageOriginalName || '이미지',
      url: post.imageUrl,
      width: 'large',
      align: 'center',
    },
  ]
}

function normalizeBlock(post, block) {
  if (!block || typeof block !== 'object') {
    return { type: 'text', content: String(block || '') }
  }

  if (block.type === 'image') {
    const info = mediaInfoById(post?.imageInfos, block.mediaId)
    return {
      type: 'image',
      ...(block.mediaId === undefined ? {} : { mediaId: block.mediaId }),
      name: block.name || info?.originalName || '이미지',
      url: block.url || info?.url || '',
      width: block.width || 'large',
      align: block.align || 'center',
    }
  }

  if (block.type === 'video') {
    const info = mediaInfoById(post?.videoInfos, block.mediaId)
    return {
      type: 'video',
      ...(block.mediaId === undefined ? {} : { mediaId: block.mediaId }),
      name: block.name || info?.originalName || '영상',
      url: block.url || info?.url || '',
      width: block.width || 'large',
      align: block.align || 'center',
    }
  }

  if (block.type === 'file') {
    const info = mediaInfoById(post?.fileInfos, block.fileId)
    return {
      type: 'file',
      ...(block.fileId === undefined ? {} : { fileId: block.fileId }),
      name: block.name || info?.originalName || '첨부파일',
      url: block.url || info?.url || '',
    }
  }

  if (block.type === 'externalEmbed') {
    return {
      type: 'externalEmbed',
      provider: block.provider || 'external',
      kind: block.kind || 'link',
      url: block.url || '',
      embedUrl: block.embedUrl || '',
      title: block.title || '',
      width: block.width || 75,
      align: block.align || 'center',
    }
  }

  if (block.type === 'poll') {
    return {
      type: 'poll',
      pollId: block.pollId || block.id || '',
      question: block.question || block.title || block.prompt || '투표',
      options: Array.isArray(block.options)
        ? block.options
        : Array.isArray(block.choices)
          ? block.choices
          : Array.isArray(block.answers)
            ? block.answers
            : [],
    }
  }

  return { type: 'text', content: block.content || '' }
}

function normalizeBlocks(post, blocks, depth = 0) {
  const normalized = []
  for (const block of blocks) {
    if (depth < 4 && block?.type === 'text') {
      const nested = parseContentBlocks(block.content)
      if (nested) {
        normalized.push(...normalizeBlocks(post, nested, depth + 1))
        continue
      }
    }
    normalized.push(normalizeBlock(post, block))
  }
  return normalized
}

export function postBlocks(post) {
  if (!post) return [{ type: 'text', content: '' }]

  const parsedBlocks = parseContentBlocks(post.content)
  if (parsedBlocks) {
    return withLegacyImage(post, normalizeBlocks(post, parsedBlocks))
  }

  return withLegacyImage(post, [{ type: 'text', content: post.content || '' }])
}

export function pollOptionLabel(option) {
  if (typeof option === 'object' && option !== null) {
    return String(option.label || option.text || option.title || option.value || '')
  }
  return String(option || '')
}

export function pollOptionImageUrl(option) {
  if (typeof option === 'object' && option !== null) {
    return String(option.imageUrl || option.image || option.thumbnailUrl || '')
  }
  return ''
}

export function pollTotals(result) {
  const counts = Array.isArray(result?.optionCounts) ? result.optionCounts.map((count) => Number(count || 0)) : []
  return {
    counts,
    total: counts.reduce((sum, count) => sum + count, 0),
  }
}

// Walk every shape we have seen for posted content (JSON block arrays, single
// objects, plain text mistakenly stored as JSON) and harvest the author text.
function harvestText(value) {
  if (value == null) return ''
  if (typeof value === 'string') {
    const stripped = plainText(value).trim()
    if (!stripped) return ''
    if (!looksLikeBlockJson(stripped)) return stripped
    try {
      return harvestText(JSON.parse(stripped))
    } catch {
      // Looks like block JSON but won't parse (e.g. a dashboard-truncated
      // preview). Never surface raw `[{"type":...}]` to the UI.
      return ''
    }
  }
  if (Array.isArray(value)) {
    return value.map((entry) => harvestText(entry)).filter(Boolean).join(' ').trim()
  }
  if (typeof value === 'object') {
    if (value.type && value.type !== 'text' && value.type !== 'externalEmbed') {
      // image / video / file / poll — they carry no author body text.
      return value.title ? plainText(value.title).trim() : ''
    }
    return harvestText(value.content ?? value.text ?? '')
  }
  return ''
}

function hasImageEvidence(post, blocks) {
  if (post?.imageUrl) return true
  if (Array.isArray(post?.imageUrls) && post.imageUrls.length) return true
  if (Array.isArray(post?.imageInfos) && post.imageInfos.length) return true
  return blocks.some((block) => block.type === 'image' || (block.type === 'externalEmbed' && block.kind === 'image'))
}

export function postPreviewText(post) {
  const blocks = postBlocks(post)
  const poll = blocks.find((block) => block.type === 'poll' && block.question)
  const pollLabel = poll ? `투표: ${plainText(poll.question)}` : ''
  const withPollLabel = (text) => (pollLabel ? `${text} · ${pollLabel}` : text)

  // 1. Walk the normalised blocks, then the raw post.content. Whichever yields
  //    real author text first wins.
  const fromBlocks = harvestText(blocks)
  if (fromBlocks) return preview(withPollLabel(fromBlocks))

  const fromRaw = harvestText(post?.content)
  if (fromRaw) return preview(withPollLabel(fromRaw))

  if (pollLabel) return preview(pollLabel)

  if (hasImageEvidence(post, blocks)) return '이미지가 포함된 글입니다.'
  if (blocks.some((block) => block.type === 'video')) return '영상이 포함된 글입니다.'
  if (blocks.some((block) => block.type === 'file')) return '첨부파일이 포함된 글입니다.'

  return '내용 미리보기가 없습니다.'
}

// A post is "text only" when it has no images/videos/files/polls — i.e. its
// whole content can be safely round-tripped through the mobile text composer.
// (Editing a media post here would drop the media it can't re-render, so those
// are edited on the web instead.)
export function isTextOnlyPost(post) {
  if (!post) return false
  if (post.imageUrl) return false
  if (Array.isArray(post.imageInfos) && post.imageInfos.length) return false
  if (Array.isArray(post.imageUrls) && post.imageUrls.length) return false
  if (Array.isArray(post.videoInfos) && post.videoInfos.length) return false
  if (Array.isArray(post.fileInfos) && post.fileInfos.length) return false
  const blocks = postBlocks(post)
  return blocks.every((block) => block?.type === 'text')
}

// Full author body text (not truncated) — used to seed the edit form.
export function postBodyText(post) {
  return harvestText(postBlocks(post)) || harvestText(post?.content) || ''
}

// Preview for any block-JSON content (e.g. a notice's `content`), which may be a
// JSON block array rather than plain text. Harvests the author text so we never
// render raw `[{"type":"text",...}]` in a list. Falls back to a media hint.
export function contentPreview(content, limit = 90) {
  const text = harvestText(content)
  if (text) return preview(text, limit)
  const blocks = parseContentBlocks(content) || []
  if (blocks.some((block) => block?.type === 'image')) return '이미지가 포함된 내용입니다.'
  if (blocks.some((block) => block?.type === 'video')) return '영상이 포함된 내용입니다.'
  if (blocks.some((block) => block?.type === 'file')) return '첨부파일이 포함된 내용입니다.'
  return '내용 미리보기가 없습니다.'
}
