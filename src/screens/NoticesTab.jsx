import { formatDate, plainText, preview } from '../utils/format.js'
import { latest } from '../utils/helpers.js'
import { Detail, Empty, ListItem, LoadingScreen, Section } from '../components/ui.jsx'

export default function NoticesTab({ notices, selected, loading, openNotice, closeNotice }) {
  if (selected) {
    return (
      <Detail title={selected.title} meta={formatDate(selected.createdAt)} onBack={closeNotice}>
        {selected.pinned && <span className="badge">중요 공지</span>}
        {loading ? <LoadingScreen label="공지 상세를 불러오는 중입니다." /> : <p className="body-text">{plainText(selected.content)}</p>}
      </Detail>
    )
  }
  const items = latest(notices, 'createdAt')
  return (
    <Section title="공지사항">
      {items.map((notice) => <ListItem key={notice.id} title={notice.title} meta={formatDate(notice.createdAt)} body={preview(notice.content)} pinned={notice.pinned} onClick={() => openNotice(notice.id)} />)}
      {items.length === 0 && <Empty text="등록된 공지가 없습니다." />}
    </Section>
  )
}
