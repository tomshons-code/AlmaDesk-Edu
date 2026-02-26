const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateUserRoles() {
  try {
    console.log('[UpdateRoles] Updating user roles...')

    const result = await prisma.$executeRaw`
      UPDATE users
      SET role = CAST('KLIENT' AS "Role")
      WHERE role = CAST('USER' AS "Role")
    `

    console.log(`[UpdateRoles] Updated ${result} users from USER to KLIENT`)

    const users = await prisma.$queryRaw`SELECT id, login, role::text FROM users`
    console.log('\n[UpdateRoles] Current users:')
    console.table(users)

  } catch (error) {
    console.error('[UpdateRoles] Error during update:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

updateUserRoles()
