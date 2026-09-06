import type { AgentTool } from '../types'
import { createCalendarEvent, listCalendarEvents, listCalendars, suggestCalendarFreeTime } from '../../../../plugins/connectors/adapters/google-calendar-adapter'
import { createGmailDraft, readGmailMessage, searchGmailThreads, sendGmailMessage } from '../../../../plugins/connectors/adapters/gmail-adapter'
import { searchDriveFiles } from '../../../../plugins/connectors/adapters/google-drive-adapter'
import { syncDrivePdfsToRag } from '../../../../plugins/connectors/drive-rag-sync'
import { googleWorkspaceStatus, isGoogleServiceConnected } from '../../../../plugins/connectors/oauth/google-token-store'
import type { GoogleConnectorId } from '../../../../plugins/connectors/oauth/google-oauth'

async function requireGoogle(id: GoogleConnectorId): Promise<void> {
  if (!(await isGoogleServiceConnected(id))) {
    throw new Error(`${id} is not connected. Connect it on the Connectors page.`)
  }
}

export function createGoogleWorkspaceTools(): AgentTool[] {
  return [
    {
      name: 'connector.google.status',
      description: 'Show Google Workspace OAuth status for Drive, Gmail, and Calendar.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        return googleWorkspaceStatus()
      },
    },
    {
      name: 'calendar.list',
      description: 'List Google calendars or events. Fail-closed if Calendar is not connected.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        await requireGoogle('google-calendar')
        if (args.calendarsOnly === true) return listCalendars()
        return listCalendarEvents({
          calendarId: typeof args.calendarId === 'string' ? args.calendarId : undefined,
          timeMin: typeof args.timeMin === 'string' ? args.timeMin : undefined,
          timeMax: typeof args.timeMax === 'string' ? args.timeMax : undefined,
          query: typeof args.query === 'string' ? args.query : undefined,
          limit: typeof args.limit === 'number' ? args.limit : undefined,
        })
      },
    },
    {
      name: 'calendar.create',
      description: 'Create a Google Calendar event. Requires approval.',
      risk: 'medium',
      requiresApproval: true,
      async execute(args) {
        await requireGoogle('google-calendar')
        return createCalendarEvent({
          calendarId: typeof args.calendarId === 'string' ? args.calendarId : undefined,
          summary: typeof args.summary === 'string' ? args.summary : '',
          description: typeof args.description === 'string' ? args.description : undefined,
          start: typeof args.start === 'string' ? args.start : '',
          end: typeof args.end === 'string' ? args.end : '',
          timeZone: typeof args.timeZone === 'string' ? args.timeZone : undefined,
        })
      },
    },
    {
      name: 'calendar.suggest',
      description: 'Suggest free time slots on Google Calendar.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        await requireGoogle('google-calendar')
        return suggestCalendarFreeTime({
          calendarId: typeof args.calendarId === 'string' ? args.calendarId : undefined,
          windowStart: typeof args.windowStart === 'string' ? args.windowStart : '',
          windowEnd: typeof args.windowEnd === 'string' ? args.windowEnd : '',
          durationMinutes: typeof args.durationMinutes === 'number' ? args.durationMinutes : 30,
          limit: typeof args.limit === 'number' ? args.limit : undefined,
        })
      },
    },
    {
      name: 'gmail.search',
      description: 'Search Gmail messages. Fail-closed if Gmail is not connected.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        await requireGoogle('gmail')
        const query = typeof args.query === 'string' ? args.query : undefined
        const limit = typeof args.limit === 'number' ? args.limit : undefined
        if (typeof args.id === 'string' && args.id.trim()) return readGmailMessage(args.id)
        return searchGmailThreads({ query, limit })
      },
    },
    {
      name: 'gmail.draft',
      description: 'Create a Gmail draft. Requires approval.',
      risk: 'medium',
      requiresApproval: true,
      async execute(args) {
        await requireGoogle('gmail')
        return createGmailDraft({
          to: typeof args.to === 'string' ? args.to : '',
          subject: typeof args.subject === 'string' ? args.subject : '',
          body: typeof args.body === 'string' ? args.body : '',
        })
      },
    },
    {
      name: 'gmail.send',
      description: 'Send a Gmail message. High-risk; requires explicit approval.',
      risk: 'high',
      requiresApproval: true,
      async execute(args) {
        await requireGoogle('gmail')
        return sendGmailMessage({
          to: typeof args.to === 'string' ? args.to : '',
          subject: typeof args.subject === 'string' ? args.subject : '',
          body: typeof args.body === 'string' ? args.body : '',
        })
      },
    },
    {
      name: 'drive.search',
      description: 'Search Google Drive files. Fail-closed if Drive is not connected.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        await requireGoogle('google-drive')
        const query = typeof args.query === 'string' ? args.query : ''
        const limit = typeof args.limit === 'number' ? args.limit : 20
        return searchDriveFiles(query, limit)
      },
    },
    {
      name: 'drive.sync',
      description: 'Sync new Google Drive PDFs into the local document RAG index.',
      risk: 'medium',
      requiresApproval: true,
      async execute(args) {
        await requireGoogle('google-drive')
        return syncDrivePdfsToRag({
          folderId: typeof args.folderId === 'string' ? args.folderId : undefined,
          limit: typeof args.limit === 'number' ? args.limit : undefined,
        })
      },
    },
  ]
}
