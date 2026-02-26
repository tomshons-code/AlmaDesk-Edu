
import { get, post, put } from './apiClient'

export const getSmtpSettings = () => get('/settings/smtp')
export const updateSmtpSettings = (settings) => put('/settings/smtp', settings)
export const testSmtpSettings = (testEmail) => post('/settings/smtp/test', { testEmail })
export const getSmtpPresets = () => get('/settings/smtp/presets')

export const getScheduledReportsSettings = () => get('/settings/scheduled-reports')
export const updateScheduledReportsSettings = (settings) => put('/settings/scheduled-reports', settings)
export const triggerScheduledReport = (frequency = 'monthly', recipients = '') =>
  post('/settings/scheduled-reports/trigger', { frequency, recipients })

export const getImapSettings = () => get('/settings/imap')
export const updateImapSettings = (settings) => put('/settings/imap', settings)
export const testImapSettings = (settings) => post('/settings/imap/test', settings)
export const triggerImapPoll = () => post('/settings/imap/poll')
