const { getTransporter, getSmtpConfig, reloadTransporter } = require('../../config/email')
const config = require('../../config/env')
const prisma = require('../db')




async function sendEmail({ to, subject, html, text, attachments }) {
  const transporter = await getTransporter()

  if (!transporter) {
    console.warn('[Email] Email transporter not configured - skipping email send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const smtpConfig = getSmtpConfig()
    const fromName = smtpConfig?.fromName || config.SMTP_FROM_NAME || 'AlmaDesk Support'
    const fromEmail = smtpConfig?.fromEmail || config.SMTP_FROM_EMAIL || 'noreply@almadesk.edu'

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: text || stripHtml(html),
      html
    }
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments
    }

    const info = await transporter.sendMail(mailOptions)

    console.log(`[Email] Email sent: ${subject} -> ${to}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[Email] Failed to send email:', error.message)
    return { success: false, error: error.message }
  }
}


function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}


async function getAgents() {
  return await prisma.user.findMany({
    where: {
      role: {
        in: ['AGENT', 'SUPER_ADMIN']
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      login: true
    }
  })
}


async function sendNewTicketNotification(ticket) {
  try {
    const agents = await getAgents()

    if (agents.length === 0) {
      console.warn('[Email] No agents found to notify about new ticket')
      return
    }

    const ticketUrl = `${config.FRONTEND_URL}/dashboard/tickets/${ticket.id}`

    const subject = `[AlmaDesk] Nowe zgłoszenie #${ticket.id}: ${ticket.title}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 8px; }
          .priority-high { background: #fee2e2; color: #991b1b; }
          .priority-medium { background: #fef3c7; color: #92400e; }
          .priority-low { background: #dbeafe; color: #1e40af; }
          .category { background: #e0e7ff; color: #3730a3; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">🎫 Nowe zgłoszenie</h2>
          </div>
          <div class="content">
            <p>Utworzono nowe zgłoszenie w systemie AlmaDesk:</p>

            <div class="ticket-info">
              <h3 style="margin-top: 0;">#${ticket.id}: ${ticket.title}</h3>

              <p><span class="label">Opis:</span><br/>
              ${ticket.description}</p>

              <p>
                <span class="badge priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                <span class="badge category">${ticket.category}</span>
              </p>

              <p><span class="label">Zgłaszający:</span> ${ticket.createdBy.name || ticket.createdBy.login}</p>
              <p><span class="label">Data utworzenia:</span> ${new Date(ticket.createdAt).toLocaleString('pl-PL')}</p>
            </div>

            <a href="${ticketUrl}" class="button">Zobacz zgłoszenie</a>

            <p style="color: #6b7280; font-size: 14px;">
              To zgłoszenie oczekuje na przypisanie i obsługę przez agenta.
            </p>
          </div>
          <div class="footer">
            <p>AlmaDesk - System Zarządzania Zgłoszeniami<br/>
            To jest automatyczna wiadomość - nie odpowiadaj na nią.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const results = await Promise.allSettled(
      agents.map(agent =>
        sendEmail({
          to: agent.email,
          subject,
          html
        })
      )
    )

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    console.log(`[Email] Sent new ticket notification to ${successCount}/${agents.length} agents`)

  } catch (error) {
    console.error('[Email] Failed to send new ticket notifications:', error.message)
  }
}


async function sendStatusChangeNotification(ticket, oldStatus, newStatus) {
  try {
    const creator = await prisma.user.findUnique({
      where: { id: ticket.createdById },
      select: { email: true, name: true, login: true }
    })

    if (!creator || !creator.email) {
      console.warn('[Email] Ticket creator has no email - skipping notification')
      return
    }

    const ticketUrl = `${config.FRONTEND_URL}/portal/tickets/${ticket.id}`

    const statusLabels = {
      OPEN: 'Otwarte',
      IN_PROGRESS: 'W trakcie',
      WAITING_FOR_USER: 'Oczekuje na użytkownika',
      WAITING_FOR_AGENT: 'Oczekuje na agenta',
      RESOLVED: 'Rozwiązane',
      CLOSED: 'Zamknięte'
    }

    const subject = `[AlmaDesk] Zmiana statusu zgłoszenia #${ticket.id}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .status-change { background: white; padding: 20px; border-radius: 6px; margin: 15px 0; text-align: center; }
          .status-box { display: inline-block; padding: 10px 20px; border-radius: 6px; font-weight: bold; margin: 0 10px; }
          .status-old { background: #e5e7eb; color: #374151; }
          .status-new { background: #10b981; color: white; }
          .arrow { font-size: 24px; color: #6b7280; margin: 0 10px; }
          .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">🔄 Zmiana statusu zgłoszenia</h2>
          </div>
          <div class="content">
            <p>Status Twojego zgłoszenia został zaktualizowany:</p>

            <div class="status-change">
              <div>
                <span class="status-box status-old">${statusLabels[oldStatus] || oldStatus}</span>
                <span class="arrow">→</span>
                <span class="status-box status-new">${statusLabels[newStatus] || newStatus}</span>
              </div>
            </div>

            <div class="ticket-info">
              <h3 style="margin-top: 0;">#${ticket.id}: ${ticket.title}</h3>
              <p><strong>Aktualny status:</strong> ${statusLabels[newStatus] || newStatus}</p>
              ${ticket.assignedTo ? `<p><strong>Przypisany agent:</strong> ${ticket.assignedTo.name || ticket.assignedTo.login}</p>` : ''}
            </div>

            <a href="${ticketUrl}" class="button">Zobacz szczegóły zgłoszenia</a>
          </div>
          <div class="footer">
            <p>AlmaDesk - System Zarządzania Zgłoszeniami<br/>
            To jest automatyczna wiadomość - nie odpowiadaj na nią.</p>
          </div>
        </div>
      </body>
      </html>
    `

    await sendEmail({
      to: creator.email,
      subject,
      html
    })

    console.log(`[Email] Sent status change notification to ${creator.email}`)

  } catch (error) {
    console.error('[Email] Failed to send status change notification:', error.message)
  }
}


async function sendNewCommentNotification(comment, ticket) {
  try {
    const recipients = []

    if (ticket.createdById !== comment.authorId) {
      const creator = await prisma.user.findUnique({
        where: { id: ticket.createdById },
        select: { email: true, name: true, login: true, role: true }
      })

      if (creator && creator.email && (!comment.isInternal || creator.role !== 'USER')) {
        recipients.push(creator)
      }
    }

    if (ticket.assignedToId && ticket.assignedToId !== comment.authorId) {
      const assignee = await prisma.user.findUnique({
        where: { id: ticket.assignedToId },
        select: { email: true, name: true, login: true, role: true }
      })

      if (assignee && assignee.email && !recipients.find(r => r.email === assignee.email)) {
        recipients.push(assignee)
      }
    }

    if (comment.isInternal) {
      const agents = await getAgents()
      agents.forEach(agent => {
        if (agent.id !== comment.authorId && agent.email && !recipients.find(r => r.email === agent.email)) {
          recipients.push(agent)
        }
      })
    }

    if (recipients.length === 0) {
      console.log('[Email] No recipients for comment notification')
      return
    }

    const ticketUrl = `${config.FRONTEND_URL}/dashboard/tickets/${ticket.id}`

    const subject = `[AlmaDesk] Nowy komentarz w zgłoszeniu #${ticket.id}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .comment-box { background: white; padding: 20px; border-left: 4px solid #2563eb; border-radius: 6px; margin: 15px 0; }
          .comment-meta { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
          .ticket-info { background: #e0e7ff; padding: 12px; border-radius: 6px; margin: 15px 0; font-size: 14px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; background: #fbbf24; color: #78350f; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">💬 Nowy komentarz</h2>
          </div>
          <div class="content">
            <p>Dodano nowy komentarz do zgłoszenia:</p>

            <div class="ticket-info">
              <strong>#${ticket.id}: ${ticket.title}</strong>
            </div>

            <div class="comment-box">
              <div class="comment-meta">
                <strong>${comment.author.name || comment.author.login}</strong>
                ${comment.isInternal ? '<span class="badge">WEWNĘTRZNY</span>' : ''}
                <br/>
                ${new Date(comment.createdAt).toLocaleString('pl-PL')}
              </div>
              <p>${comment.content.replace(/\n/g, '<br/>')}</p>
            </div>

            <a href="${ticketUrl}" class="button">Zobacz zgłoszenie</a>
          </div>
          <div class="footer">
            <p>AlmaDesk - System Zarządzania Zgłoszeniami<br/>
            To jest automatyczna wiadomość - nie odpowiadaj na nią.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const results = await Promise.allSettled(
      recipients.map(recipient =>
        sendEmail({
          to: recipient.email,
          subject,
          html
        })
      )
    )

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    console.log(`[Email] Sent comment notification to ${successCount}/${recipients.length} recipients`)

  } catch (error) {
    console.error('[Email] Failed to send comment notifications:', error.message)
  }
}

module.exports = {
  sendEmail,
  sendNewTicketNotification,
  sendStatusChangeNotification,
  sendNewCommentNotification,
  reloadTransporter
}
