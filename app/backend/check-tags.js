const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTags() {
  const tags = await prisma.tag.findMany()
  console.log('Liczba tagów w bazie:', tags.length)
  tags.forEach(t => console.log(`- ${t.name} (color: ${t.color})`))
  await prisma.$disconnect()
}

checkTags()
