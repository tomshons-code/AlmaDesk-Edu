
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { verifyToken } = require('../../middlewares/jwt.middleware')
const PDFDocument = require('pdfkit')
const ExcelJS = require('exceljs')

const FONT_PATHS = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
]
const FONT_BOLD_PATHS = [
  'C:/Windows/Fonts/arialbd.ttf',
  'C:/Windows/Fonts/Arialbd.ttf',
  '/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
]
function findFontPath(paths) {
  for (const p of paths) { if (fs.existsSync(p)) return p }
  return null
}
const ARIAL_PATH = findFontPath(FONT_PATHS)
const ARIAL_BOLD_PATH = findFontPath(FONT_BOLD_PATHS)

const prisma = require('../db')

const requireAgentOrAdmin = (req, res, next) => {
  if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Agent privileges required.' })
  }
  next()
}

router.get('/data', verifyToken, requireAgentOrAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      priority,
      category,
      assignedTo,
      createdById
    } = req.query

    const where = {}

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) }
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) }
    }
    if (status && status !== 'all') {
      where.status = status
    }
    if (priority && priority !== 'all') {
      where.priority = priority
    }
    if (category && category !== 'all') {
      where.category = category
    }
    if (assignedTo && assignedTo !== 'all') {
      where.assignedTo = {
        login: assignedTo
      }
    }
    if (createdById) {
      where.createdById = parseInt(createdById)
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            login: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const stats = {
      total: tickets.length,
      byStatus: {},
      byPriority: {},
      byCategory: {},
      avgResolutionTime: 0,
      resolvedCount: 0
    }

    let totalResolutionTime = 0
    let resolvedTickets = 0

    tickets.forEach(ticket => {
      stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1

      stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1

      stats.byCategory[ticket.category] = (stats.byCategory[ticket.category] || 0) + 1

      if ((ticket.status === 'resolved' || ticket.status === 'closed') && ticket.resolvedAt) {
        const resolutionTime = new Date(ticket.resolvedAt) - new Date(ticket.createdAt)
        totalResolutionTime += resolutionTime
        resolvedTickets++
      }
    })

    if (resolvedTickets > 0) {
      stats.avgResolutionTime = Math.round(totalResolutionTime / resolvedTickets / (1000 * 60 * 60))
    }
    stats.resolvedCount = resolvedTickets

    res.json({
      tickets,
      stats,
      filters: req.query
    })
  } catch (error) {
    console.error('Error fetching report data:', error)
    res.status(500).json({ error: 'Failed to fetch report data' })
  }
})

router.post('/export/pdf', verifyToken, requireAgentOrAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      priority,
      category,
      assignedTo,
      tickets,
      stats
    } = req.body

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true,
      autoFirstPage: true
    })

    if (ARIAL_PATH) {
      doc.registerFont('Polish', ARIAL_PATH)
      if (ARIAL_BOLD_PATH) doc.registerFont('Polish-Bold', ARIAL_BOLD_PATH)
      doc.font('Polish')
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=raport-${Date.now()}.pdf`)

    doc.pipe(res)

    const primaryColor = '#3B82F6'
    const secondaryColor = '#6B7280'
    const successColor = '#10B981'
    const dangerColor = '#EF4444'

    doc.rect(0, 0, doc.page.width, 120).fill(primaryColor)
    doc.fontSize(24).fillColor('#FFFFFF')
    doc.text('Raport Zgłoszeń AlmaDesk', 50, 40, { align: 'center' })
    doc.fontSize(10).fillColor('#E5E7EB')
    doc.text(`Wygenerowano: ${new Date().toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 50, 80, { align: 'center' })

    doc.moveDown(3)
    doc.fillColor('#000000')

    let yPos = 140
    doc.fontSize(14).fillColor(primaryColor).text('Filtry:', 50, yPos)
    yPos += 25

    doc.fontSize(10).fillColor('#000000')
    if (startDate || endDate) {
      const fromDate = startDate ? new Date(startDate).toLocaleDateString('pl-PL') : '-'
      const toDate = endDate ? new Date(endDate).toLocaleDateString('pl-PL') : '-'
      doc.text(`Okres: ${fromDate} - ${toDate}`, 50, yPos)
      yPos += 18
    }
    if (status && status !== 'all') {
      doc.text(`Status: ${getStatusLabel(status)}`, 50, yPos)
      yPos += 18
    }
    if (priority && priority !== 'all') {
      doc.text(`Priorytet: ${getPriorityLabel(priority)}`, 50, yPos)
      yPos += 18
    }
    if (category && category !== 'all') {
      doc.text(`Kategoria: ${getCategoryLabel(category)}`, 50, yPos)
      yPos += 18
    }
    if (assignedTo && assignedTo !== 'all') {
      doc.text(`Przypisany do: ${assignedTo}`, 50, yPos)
      yPos += 18
    }

    yPos += 10

    doc.fontSize(14).fillColor(primaryColor).text('Statystyki:', 50, yPos)
    yPos += 30

    const boxWidth = 120
    const boxHeight = 70
    const boxSpacing = 15
    let xPos = 50

    doc.rect(xPos, yPos, boxWidth, boxHeight).fillAndStroke(primaryColor, primaryColor)
    doc.fontSize(24).fillColor('#FFFFFF').text(stats.total.toString(), xPos, yPos + 15, { width: boxWidth, align: 'center' })
    doc.fontSize(9).fillColor('#E5E7EB').text('Łączna liczba', xPos, yPos + 45, { width: boxWidth, align: 'center' })

    xPos += boxWidth + boxSpacing

    doc.rect(xPos, yPos, boxWidth, boxHeight).fillAndStroke(successColor, successColor)
    doc.fontSize(24).fillColor('#FFFFFF').text(stats.resolvedCount.toString(), xPos, yPos + 15, { width: boxWidth, align: 'center' })
    doc.fontSize(9).fillColor('#E5E7EB').text('Rozwiązane', xPos, yPos + 45, { width: boxWidth, align: 'center' })

    xPos += boxWidth + boxSpacing

    doc.rect(xPos, yPos, boxWidth, boxHeight).fillAndStroke(secondaryColor, secondaryColor)
    const avgTime = stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime}h` : 'N/A'
    doc.fontSize(24).fillColor('#FFFFFF').text(avgTime, xPos, yPos + 15, { width: boxWidth, align: 'center' })
    doc.fontSize(9).fillColor('#E5E7EB').text('Średni czas', xPos, yPos + 45, { width: boxWidth, align: 'center' })

    xPos += boxWidth + boxSpacing

    const resolutionRate = stats.total > 0 ? Math.round((stats.resolvedCount / stats.total) * 100) : 0
    doc.rect(xPos, yPos, boxWidth, boxHeight).fillAndStroke('#F59E0B', '#F59E0B')
    doc.fontSize(24).fillColor('#FFFFFF').text(`${resolutionRate}%`, xPos, yPos + 15, { width: boxWidth, align: 'center' })
    doc.fontSize(9).fillColor('#E5E7EB').text('Wskaźnik', xPos, yPos + 45, { width: boxWidth, align: 'center' })

    yPos += boxHeight + 30

    doc.fontSize(12).fillColor(primaryColor).text('Podział według statusu:', 50, yPos)
    doc.fontSize(12).fillColor(primaryColor).text('Podział według priorytetu:', 300, yPos)
    yPos += 20

    let statusYPos = yPos
    let priorityYPos = yPos

    doc.fontSize(9).fillColor('#000000')

    Object.entries(stats.byStatus).forEach(([status, count]) => {
      doc.text(`${getStatusLabel(status)}: ${count}`, 50, statusYPos)
      statusYPos += 16
    })

    Object.entries(stats.byPriority).forEach(([priority, count]) => {
      doc.text(`${getPriorityLabel(priority)}: ${count}`, 300, priorityYPos)
      priorityYPos += 16
    })

    yPos = Math.max(statusYPos, priorityYPos) + 20
    doc.fontSize(12).fillColor(primaryColor).text('Podział według kategorii:', 50, yPos)
    yPos += 20

    doc.fontSize(9).fillColor('#000000')
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      doc.text(`${getCategoryLabel(category)}: ${count}`, 50, yPos)
      yPos += 16
    })

    if (tickets && tickets.length > 0) {
      doc.addPage()

      doc.fontSize(16).fillColor(primaryColor).text('Lista zgłoszeń', 50, 50)
      doc.fontSize(9).fillColor(secondaryColor).text(`Pokazano ${Math.min(tickets.length, 40)} z ${tickets.length} zgłoszeń`, 50, 75)

      let tableY = 100
      const tableHeaders = ['ID', 'Tytuł', 'Status', 'Priorytet', 'Data']
      const columnWidths = [35, 180, 95, 95, 75]
      let tableX = 50
      const rowHeight = 18

      doc.rect(50, tableY, 495, 22).fillAndStroke('#F3F4F6', '#E5E7EB')
      doc.fontSize(9).fillColor('#000000')

      tableHeaders.forEach((header, i) => {
        doc.text(header, tableX + 5, tableY + 6, { width: columnWidths[i] - 10, align: 'left' })
        tableX += columnWidths[i]
      })

      tableY += 22

      tickets.slice(0, 40).forEach((ticket, index) => {
        if (tableY > 750) {
          doc.addPage()
          tableY = 50

          tableX = 50
          doc.rect(50, tableY, 495, 22).fillAndStroke('#F3F4F6', '#E5E7EB')
          doc.fontSize(9).fillColor('#000000')
          tableHeaders.forEach((header, i) => {
            doc.text(header, tableX + 5, tableY + 6, { width: columnWidths[i] - 10, align: 'left' })
            tableX += columnWidths[i]
          })
          tableY += 22
        }

        if (index % 2 === 0) {
          doc.rect(50, tableY, 495, rowHeight).fill('#FAFAFA')
        }

        tableX = 50
        doc.fontSize(8).fillColor('#000000')

        doc.text(`#${ticket.id}`, tableX + 5, tableY + 5, {
          width: columnWidths[0] - 10,
          lineBreak: false,
          ellipsis: true
        })
        tableX += columnWidths[0]

        const title = ticket.title.length > 40 ? ticket.title.substring(0, 37) + '...' : ticket.title
        doc.text(title, tableX + 5, tableY + 5, {
          width: columnWidths[1] - 10,
          lineBreak: false,
          ellipsis: true
        })
        tableX += columnWidths[1]

        doc.text(getStatusLabel(ticket.status), tableX + 5, tableY + 5, {
          width: columnWidths[2] - 10,
          lineBreak: false
        })
        tableX += columnWidths[2]

        doc.text(getPriorityLabel(ticket.priority), tableX + 5, tableY + 5, {
          width: columnWidths[3] - 10,
          lineBreak: false
        })
        tableX += columnWidths[3]

        doc.text(new Date(ticket.createdAt).toLocaleDateString('pl-PL'), tableX + 5, tableY + 5, {
          width: columnWidths[4] - 10,
          lineBreak: false
        })

        tableY += rowHeight
      })

      if (tickets.length > 40) {
        tableY += 10
        doc.fontSize(9).fillColor(secondaryColor).text(
          `... i ${tickets.length - 40} więcej zgłoszeń (pobierz Excel aby zobaczyć wszystkie)`,
          50, tableY, { align: 'center', width: 495 }
        )
      }
    }

    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.fontSize(8).fillColor(secondaryColor)
      doc.text(
        `AlmaDesk - Strona ${i + 1} z ${pageCount}`,
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 }
      )
    }

    doc.end()
  } catch (error) {
    console.error('Error generating PDF:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF report' })
    }
  }
})

router.post('/export/excel', verifyToken, requireAgentOrAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      priority,
      category,
      assignedTo,
      tickets,
      stats
    } = req.body

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'AlmaDesk'
    workbook.created = new Date()

    const summarySheet = workbook.addWorksheet('Podsumowanie')

    summarySheet.columns = [
      { header: 'Metryka', key: 'metric', width: 30 },
      { header: 'Wartość', key: 'value', width: 20 }
    ]

    summarySheet.addRow({ metric: 'Data wygenerowania', value: new Date().toLocaleString('pl-PL') })
    summarySheet.addRow({ metric: '', value: '' })

    if (startDate) summarySheet.addRow({ metric: 'Okres od', value: new Date(startDate).toLocaleDateString('pl-PL') })
    if (endDate) summarySheet.addRow({ metric: 'Okres do', value: new Date(endDate).toLocaleDateString('pl-PL') })
    summarySheet.addRow({ metric: '', value: '' })

    summarySheet.addRow({ metric: 'Łączna liczba zgłoszeń', value: stats.total })
    summarySheet.addRow({ metric: 'Rozwiązane zgłoszenia', value: stats.resolvedCount })
    if (stats.avgResolutionTime > 0) {
      summarySheet.addRow({ metric: 'Średni czas rozwiązania (h)', value: stats.avgResolutionTime })
    }
    summarySheet.addRow({ metric: '', value: '' })

    summarySheet.addRow({ metric: 'Podział według statusu:', value: '' })
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      summarySheet.addRow({ metric: `  ${getStatusLabel(status)}`, value: count })
    })
    summarySheet.addRow({ metric: '', value: '' })

    summarySheet.addRow({ metric: 'Podział według priorytetu:', value: '' })
    Object.entries(stats.byPriority).forEach(([priority, count]) => {
      summarySheet.addRow({ metric: `  ${getPriorityLabel(priority)}`, value: count })
    })

    summarySheet.getRow(1).font = { bold: true, size: 12 }
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    }
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    if (tickets && tickets.length > 0) {
      const ticketsSheet = workbook.addWorksheet('Zgłoszenia')

      ticketsSheet.columns = [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Tytuł', key: 'title', width: 40 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Priorytet', key: 'priority', width: 15 },
        { header: 'Kategoria', key: 'category', width: 15 },
        { header: 'Zgłaszający', key: 'creator', width: 25 },
        { header: 'Przypisany do', key: 'assignee', width: 25 },
        { header: 'Data utworzenia', key: 'createdAt', width: 20 },
        { header: 'Data rozwiązania', key: 'resolvedAt', width: 20 },
        { header: 'Tagi', key: 'tags', width: 30 }
      ]

      tickets.forEach(ticket => {
        ticketsSheet.addRow({
          id: ticket.id,
          title: ticket.title,
          status: getStatusLabel(ticket.status),
          priority: getPriorityLabel(ticket.priority),
          category: getCategoryLabel(ticket.category),
          creator: ticket.createdBy ? ticket.createdBy.name : 'Nieznany',
          assignee: ticket.assignedTo ? ticket.assignedTo.name : 'Nieprzypisane',
          createdAt: new Date(ticket.createdAt).toLocaleString('pl-PL'),
          resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString('pl-PL') : '',
          tags: ticket.tags ? ticket.tags.map(t => t.tag.name).join(', ') : ''
        })
      })

      const headerRow = ticketsSheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' }
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

      ticketsSheet.autoFilter = {
        from: 'A1',
        to: 'J1'
      }

      ticketsSheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
      ]
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=raport-${Date.now()}.xlsx`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error('Error generating Excel:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate Excel report' })
    }
  }
})

function getStatusLabel(status) {
  const labels = {
    open: 'Nowe',
    'in-progress': 'W trakcie',
    resolved: 'Rozwiązane',
    closed: 'Zamknięte'
  }
  return labels[status] || status
}

function getPriorityLabel(priority) {
  const labels = {
    low: 'Niski',
    medium: 'Średni',
    high: 'Wysoki',
    critical: 'Krytyczny'
  }
  return labels[priority] || priority
}

function getCategoryLabel(category) {
  const labels = {
    hardware: 'Sprzęt',
    software: 'Oprogramowanie',
    network: 'Sieć',
    access: 'Dostęp',
    account: 'Konto',
    other: 'Inne'
  }
  return labels[category] || category
}

module.exports = router
