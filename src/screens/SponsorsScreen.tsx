import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, HeartHandshake, Mail, UsersRound } from 'lucide-react'
import type { CSSProperties } from 'react'
import {
  SPONSOR_PAGE_QUERY_KEY,
  SPONSOR_TIERS_QUERY_KEY,
  getSponsorPage,
  listSponsorTiers,
} from '../services/sponsorsApi'
import type { Sponsor, SponsorTier } from '../services/responseSchemas'
import { mediaSrc } from '../utils/helpers'
import { looksLikeHtml, renderSafeHtml } from '../utils/markdown'
import { safeExternalHref } from '../utils/urlValidation'

const FALLBACK_TIER_COLOR = '#86868b'
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i

function safeColor(value: unknown, fallback = FALLBACK_TIER_COLOR) {
  const color = String(value || '').trim()
  return SAFE_COLOR.test(color) ? color : fallback
}

function safeMediaSrc(value: unknown) {
  const src = String(value || '').trim()
  if (!src) return ''
  return src.startsWith('/') ? mediaSrc(src) : safeExternalHref(src)
}

function richHtml(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (looksLikeHtml(raw)) return renderSafeHtml(raw)
  return renderSafeHtml(raw).replace(/\n/g, '<br />')
}

function displayDate(value: unknown) {
  const raw = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ''
  const [year, month, day] = raw.split('-').map(Number)
  return `${year}. ${month}. ${day}.`
}

function sponsorPeriod(sponsor: Sponsor) {
  const since = displayDate(sponsor.sinceDate)
  const until = displayDate(sponsor.untilDate)
  if (since && until) return `${since} ~ ${until}`
  if (since) return `${since}부터`
  if (until) return `${until}까지`
  return ''
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const anonymous = Boolean(sponsor.anonymous)
  const name = anonymous ? '익명 후원자' : String(sponsor.name || '후원자')
  const logoUrl = anonymous ? '' : safeMediaSrc(sponsor.logoUrl)
  const href = anonymous ? '' : safeExternalHref(sponsor.linkUrl)
  const description = richHtml(sponsor.description)
  const period = sponsorPeriod(sponsor)
  const content = (
    <>
      <span className="sponsor-avatar" aria-hidden="true">
        {logoUrl
          ? <img src={logoUrl} alt="" loading="lazy" decoding="async" />
          : <span>{name.trim().charAt(0) || '후'}</span>}
      </span>
      <span className="sponsor-card-copy">
        <strong>{name}</strong>
        {description && <span className="sponsor-description web-post" dangerouslySetInnerHTML={{ __html: description }} />}
        {period && <span className="sponsor-period">{period}</span>}
      </span>
      {href && <ExternalLink className="sponsor-link-icon" size={15} aria-hidden="true" />}
    </>
  )

  return href
    ? <a className="sponsor-card" href={href} target="_blank" rel="noreferrer">{content}</a>
    : <article className="sponsor-card">{content}</article>
}

function SponsorTierSection({ tier, showLabel }: { tier: SponsorTier; showLabel: boolean }) {
  if (tier.sponsors.length === 0) return null
  // The backend's trailing untiered group (id null, name '') has no chip/label to show.
  showLabel = showLabel && tier.id != null
  const colorStyle = {
    '--sponsor-tier-color': safeColor(tier.color),
  } as CSSProperties

  return (
    <section className="sponsor-tier">
      {showLabel && (
        <header className="sponsor-tier-header">
          <span
            className="sponsor-tier-chip"
            data-testid={`sponsor-tier-color-${tier.id}`}
            style={colorStyle}
            aria-hidden="true"
          />
          <span>
            <h2>{tier.name || '후원자'}</h2>
            {tier.description && <p>{tier.description}</p>}
          </span>
        </header>
      )}
      <div className="sponsor-grid">
        {tier.sponsors.map((sponsor, index) => (
          <SponsorCard key={sponsor.id ?? `${tier.id}-anonymous-${index}`} sponsor={sponsor} />
        ))}
      </div>
    </section>
  )
}

export default function SponsorsScreen({ onBack }: { onBack: () => void }) {
  const tiersQuery = useQuery({
    queryKey: SPONSOR_TIERS_QUERY_KEY,
    queryFn: listSponsorTiers,
  })
  const pageQuery = useQuery({
    queryKey: SPONSOR_PAGE_QUERY_KEY,
    queryFn: getSponsorPage,
  })

  const tiers = tiersQuery.data ?? []
  const page = pageQuery.data
  const settings = page?.settings
  const sponsors = tiers.flatMap((tier) => tier.sponsors)
  const bannerImageUrl = safeMediaSrc(page?.bannerImageUrl)
  const introHtml = richHtml(settings?.introHtml)
  const howToBody = richHtml(settings?.howToSection?.bodyHtml)
  const contactLink = safeExternalHref(settings?.howToSection?.contactLink)
  const contactEmail = String(settings?.howToSection?.contactEmail || '').trim()
  const layoutClass = settings?.layout === 'LIST' ? 'sponsors-layout-list' : 'sponsors-layout-grid'
  const accentStyle = {
    '--sponsor-accent-color': safeColor(settings?.accentColor, '#0071e3'),
  } as CSSProperties

  return (
    <main className={`app-shell sponsors-screen ${layoutClass}`} style={accentStyle}>
      <header className="topbar">
        <div className="topbar-brand">
          <button type="button" className="icon-button" onClick={onBack} aria-label="뒤로"><ArrowLeft size={18} /></button>
          <h1>후원자</h1>
        </div>
      </header>
      <section className="content sponsors-content">
        <section className="hero-card sponsor-hero">
          <HeartHandshake size={24} aria-hidden="true" />
          <h2>{settings?.heroTitle || 'COMS를 응원해주신 분들'}</h2>
          {settings?.heroSubtitle && <p>{settings.heroSubtitle}</p>}
          {settings?.showCounts && (
            <p className="sponsor-counts">
              후원자 {Number(page?.sponsorCount || 0).toLocaleString('ko-KR')}명 · 후원 등급 {Number(page?.tierCount || 0).toLocaleString('ko-KR')}개
            </p>
          )}
        </section>

        {bannerImageUrl && <img className="sponsor-banner" src={bannerImageUrl} alt="후원자 페이지 배너" loading="lazy" decoding="async" />}
        {introHtml && <section className="panel sponsor-intro web-post" dangerouslySetInnerHTML={{ __html: introHtml }} />}

        {tiersQuery.isLoading && <section className="panel sponsor-status">후원자 목록을 불러오는 중입니다.</section>}
        {tiersQuery.isError && (
          <section className="empty-panel sponsor-status" role="alert">
            <p>후원자 목록을 불러오지 못했습니다.</p>
            <button type="button" className="button secondary compact" onClick={() => tiersQuery.refetch()}>다시 시도</button>
          </section>
        )}
        {!tiersQuery.isLoading && !tiersQuery.isError && sponsors.length === 0 && (
          <section className="empty-panel sponsor-status"><UsersRound size={24} aria-hidden="true" /><p>아직 등록된 후원자가 없습니다</p></section>
        )}
        {sponsors.length > 0 && (
          <div className="sponsor-tiers">
            {tiers.map((tier) => <SponsorTierSection key={tier.id ?? 'untiered'} tier={tier} showLabel={settings?.showTierLabels !== false} />)}
          </div>
        )}

        {settings?.howToSection && (
          <section className="panel sponsor-how-to">
            <div className="section-title"><h2><Mail size={14} aria-hidden="true" /> {settings.howToSection.title || '후원 안내'}</h2></div>
            {howToBody && <div className="web-post" dangerouslySetInnerHTML={{ __html: howToBody }} />}
            {settings.howToSection.bankNote && <p className="sponsor-bank-note">{settings.howToSection.bankNote}</p>}
            <div className="button-row">
              {contactLink && <a className="button secondary compact" href={contactLink} target="_blank" rel="noreferrer">후원 문의하기</a>}
              {contactEmail && <a className="button secondary compact" href={`mailto:${contactEmail}`}>이메일 문의</a>}
            </div>
          </section>
        )}

        {settings?.thankYouMessage && <p className="sponsor-thanks">{settings.thankYouMessage}</p>}
      </section>
    </main>
  )
}
