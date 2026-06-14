import { ArrowLeft, BellRing, Image, Loader2 } from 'lucide-react'

export function LoadingScreen({ label = '불러오는 중입니다.' }) {
  return (
    <div className="center-screen">
      <Loader2 className="spin" size={30} aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function Section({ title, action, onAction, children }) {
  return (
    <section className="card">
      <div className="section-title">
        <h2>{title}</h2>
        {action && <button type="button" onClick={onAction}>{action}</button>}
      </div>
      <div className="list">{children}</div>
    </section>
  )
}

export function ListItem({ title, meta, body, pinned, image, onClick, children }) {
  return (
    <button type="button" className="list-item" onClick={onClick}>
      <span className="item-title">{pinned && <b>중요</b>}{title}</span>
      {meta && <span className="item-meta">{meta}</span>}
      {body && <span className="item-body">{body}</span>}
      {image && <span className="media-chip"><Image size={14} aria-hidden="true" /> 이미지</span>}
      {children}
    </button>
  )
}

export function Empty({ text }) {
  return <p className="empty">{text}</p>
}

export function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <Icon size={18} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

export function Detail({ title, meta, onBack, children }) {
  return (
    <article className="detail">
      <button type="button" className="back-button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" />목록</button>
      <h2>{title}</h2>
      {meta && <p className="item-meta">{meta}</p>}
      {children}
    </article>
  )
}

export function Info({ label, value }) {
  return <div className="info-row"><span>{label}</span><strong>{value}</strong></div>
}

export function AppConfigBanner({ appConfig }) {
  if (!appConfig?.maintenanceMessage) return null
  return (
    <section className="app-config-banner">
      <BellRing size={17} aria-hidden="true" />
      <span>{appConfig.maintenanceMessage}</span>
    </section>
  )
}
