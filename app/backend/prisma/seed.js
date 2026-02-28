const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('[Seed] Seeding database...')

  await prisma.comment.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({
    data: {
      login: 'user',
      email: 'user@university.edu',
      name: 'Jan Kowalski',
      password: await bcrypt.hash('user123', 10),
      role: 'KLIENT'
    }
  })

  const agent = await prisma.user.create({
    data: {
      login: 'agent',
      email: 'agent@university.edu',
      name: 'Agent Smith',
      password: await bcrypt.hash('agent123', 10),
      role: 'AGENT'
    }
  })

  const admin = await prisma.user.create({
    data: {
      login: 'admin',
      email: 'admin@university.edu',
      name: 'Admin Root',
      password: await bcrypt.hash('admin123!', 10),
      role: 'SUPER_ADMIN'
    }
  })

  console.log('[Seed] Users created:', user.login, agent.login, admin.login)

  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Nie mogę się zalogować do systemu Moodle',
      description: 'Od wczoraj nie mogę zalogować się do platformy Moodle. Dostaję komunikat "Invalid credentials".',
      status: 'OPEN',
      priority: 'HIGH',
      category: 'ACCOUNT',
      createdById: user.id
    }
  })

  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Laptop nie łączy się z WiFi uczelnianym',
      description: 'Mój laptop widzi sieć "University-WiFi", ale nie mogę się połączyć. Próbowałem już kilka razy.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      category: 'NETWORK',
      createdById: user.id,
      assignedToId: agent.id
    }
  })

  const ticket3 = await prisma.ticket.create({
    data: {
      title: 'Komputer w sali 301 nie włącza się',
      description: 'Komputer przy stanowisku nr 5 w sali 301 nie reaguje na przycisk power.',
      status: 'OPEN',
      priority: 'CRITICAL',
      category: 'HARDWARE',
      createdById: user.id
    }
  })

  const ticket4 = await prisma.ticket.create({
    data: {
      title: 'Problem z licencją Microsoft Office',
      description: 'Po aktualizacji systemu Office prosi o aktywację licencji uczelnianej.',
      status: 'OPEN',
      priority: 'MEDIUM',
      category: 'SOFTWARE',
      createdById: user.id
    }
  })

  const ticket5 = await prisma.ticket.create({
    data: {
      title: 'Drukarka w bibliotece nie drukuje',
      description: 'Drukarka HP w czytelni na parterze biblioteki pokazuje błąd "Paper jam".',
      status: 'RESOLVED',
      priority: 'LOW',
      category: 'HARDWARE',
      createdById: user.id,
      assignedToId: agent.id,
      resolvedAt: new Date()
    }
  })

  console.log('[Seed] Tickets created:', ticket1.id, ticket2.id, ticket3.id, ticket4.id, ticket5.id)

  await prisma.comment.create({
    data: {
      content: 'Sprawdzam Twoje konto w systemie.',
      ticketId: ticket2.id,
      authorId: agent.id
    }
  })

  await prisma.comment.create({
    data: {
      content: 'Dziękuję za szybką reakcję!',
      ticketId: ticket2.id,
      authorId: user.id
    }
  })

  await prisma.comment.create({
    data: {
      content: 'Problem został rozwiązany. Zablokowany papier został usunięty.',
      ticketId: ticket5.id,
      authorId: agent.id
    }
  })

  console.log('[Seed] Comments created')
  console.log('[Seed] Seeding completed!')
}

main()
  .catch((e) => {
    console.error('[Seed] Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
