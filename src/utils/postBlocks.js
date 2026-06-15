import { plainText, preview } from './format.js'

function mediaInfoById(items, id) {
  return Array.isArray(items) ? items.find((item) => Number(item?.id) === Number(id)) : null
}

function hasInlineImageBlock(blocks, imageUrl) {
  return Boolean(imageUrl) && blocks.some((block) => block.type === 'image' && block.url === imageUrl)
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
      pollId: block.pollId || '',
      question: block.question || '투표',
      options: Array.isArray(block.options) ? block.options : [],
    }
  }

  return { type: 'text', content: block.content || '' }
}

export function postBlocks(post) {
  if (!post) return [{ type: 'text', content: '' }]

  try {
    const parsed = JSON.parse(post.content)
    if (Array.isArray(parsed)) {
      return withLegacyImage(post, parsed.map((block) => normalizeBlock(post, block)))
    }
  } catch {
    return withLegacyImage(post, [{ type: 'text', content: post.content || '' }])
  }

  return withLegacyImage(post, [{ type: 'text', content: post.content || '' }])
}

export function pollOptionLabel(option) {
  return typeof option === 'object' && option !== null ? String(option.label || '') : String(option || '')
}

export function pollOptionImageUrl(option) {
  return typeof option === 'object' && option !== null ? String(option.imageUrl || '') : ''
}

export function pollTotals(result) {
  const counts = Array.isArray(result?.optionCounts) ? result.optionCounts.map((count) => Number(count || 0)) : []
  return {
    counts,
    total: counts.reduce((sum, count) => sum + count, 0),
  }
}

function looksLikeBlockJson(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return false
  // The structured-block content starts with [ or { and includes a "type" tag — if a
  // plain author types either character at the very start we still want to render it.
  return (trimmed.startsWith('[') || trimmed.startsWith('{')) && /"type"\s*:/.test(trimmed)
}

function hasImageEvidence(post, blocks) {
  if (post?.imageUrl) return true
  if (Array.isArray(post?.imageUrls) && post.imageUrls.length) return true
  if (Array.isArray(post?.imageInfos) && post.imageInfos.length) return true
  return blocks.some((block) => block.type === 'image' || (block.type === 'externalEmbed' && block.kind === 'image'))
}

export function postPreviewText(post) {
  const blocks = postBlocks(post)
  const text = blocks.find((block) => {
    if (block.type !== 'text') return false
    const stripped = plainText(block.content).trim()
    return stripped.length > 0 && !looksLikeBlockJson(stripped)
  })
  if (text) return preview(text.content)

  const poll = blocks.find((block) => block.type === 'poll' && block.question)
  if (poll) return preview(`투표: ${poll.question}`)

  if (hasImageEvidence(post, blocks)) return '이미지가 포함된 글입니다.'
  if (blocks.some((block) => block.type === 'video')) return '영상이 포함된 글입니다.'
  if (blocks.some((block) => block.type === 'file')) return '첨부파일이 포함된 글입니다.'

  return '내용 미리보기가 없습니다.'
}
