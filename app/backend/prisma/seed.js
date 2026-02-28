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
