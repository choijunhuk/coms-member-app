import { buildIcsCalendar, type IcsEvent } from './icsExport'
import { isNativeRuntime } from '../services/nativeBridge'

// Turn the app's month schedule records (kind=SCHEDULE, all-day) into ICS events
// and export them: on native, write to the cache dir and hand off to the OS
// share sheet (add-to-calendar); on web, trigger a .ics blob download.
export async function exportSchedulesIcs(
  schedules: Array<{ id?: unknown; title?: string; eventDate?: string; description?: string }> = [],
  calendarName = "COM's 일정",
): Promise<{ ok: boolean; channel: string; reason?: string }> {
  const events: IcsEvent[] = (schedules || []).map((item, index) => ({
    id: String(item.id ?? index),
    title: item.title || '제목 없음',
    date: String(item.eventDate || '').slice(0, 10),
    description: item.description || '',
  })).filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date || ''))

  if (!events.length) return { ok: false, channel: 'none', reason: 'empty' }

  const ics = buildIcsCalendar(events, { calendarName })
  const filename = 'coms-schedule.ics'

  if (isNativeRuntime()) {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      const written = await Filesystem.writeFile({ path: filename, data: ics, directory: Directory.Cache, encoding: Encoding.UTF8 })
      await Share.share({ title: calendarName, url: written.uri, dialogTitle: '일정 내보내기' })
      return { ok: true, channel: 'native' }
    } catch (error) {
      return { ok: false, channel: 'native', reason: (error as Error)?.message || 'share-failed' }
    }
  }

  try {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    return { ok: true, channel: 'download' }
  } catch (error) {
    return { ok: false, channel: 'download', reason: (error as Error)?.message || 'download-failed' }
  }
}
