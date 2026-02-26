const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedTags() {
  const tags = [
    { name: 'Pilne', color: '#EF4444' },
    { name: 'Ważne', color: '#F59E0B' },
    { name: 'Bug', color: '#DC2626' },
    { name: 'Feature', color: '#10B981' },
    { name: 'Pytanie', color: '#3B82F6' },
    { name: 'Dokumentacja', color: '#8B5CF6' },
    { name: 'Backend', color: '#6366F1' },
    { name: 'Frontend', color: '#EC4899' },
    { name: 'Infrastruktura', color: '#06B6D4' },
    { name: 'Bezpieczeństwo', color: '#F97316' }
  ]

  console.log('Tworzenie przykładowych tagów...')

  for (const tag of tags) {
    try {
      await prisma.tag.create({
        data: tag
      })
      console.log(`[Seed] Created tag: ${tag.name}`)
    } catch (error) {
      console.log(`[Seed] Tag ${tag.name} already exists or error: ${error.message}`)
    }
  }

  const allTags = await prisma.tag.findMany()
  console.log(`[Seed] Total tags in database: ${allTags.length}`)

  await prisma.$disconnect()
}

seedTags()
