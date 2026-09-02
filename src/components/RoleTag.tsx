import { ROLE_LABELS } from '../utils/helpers'

// 임원 이상만 태그를 답니다. 일반 회원·준회원까지 칠하면 목록이 태그 밭이 되고,
// 익명 글은 서버가 authorRole을 null로 내려주므로 여기서도 자연히 걸러집니다.
// 색은 웹 RoleTag(components/common/RoleTag.tsx)의 amber/violet/sky 계열을
// 앱 배지 문법으로 옮긴 것 — 같은 직급이 두 클라이언트에서 같은 색으로 보입니다.
const TAGGED_ROLES = new Set(['ADMIN', 'VICE_PRESIDENT', 'OFFICER'])

// `role` is typed unknown on purpose: it arrives on the loosely-typed post
// payload, and an unrecognised value must render nothing rather than fail
// validation — a stray role should never cost anyone the post list.
export default function RoleTag({ role }: { role?: unknown }) {
  const key = String(role || '')
  if (!TAGGED_ROLES.has(key)) return null
  return <span className={`role-tag role-tag-${key.toLowerCase().replace(/_/g, '-')}`}>{ROLE_LABELS[key]}</span>
}
