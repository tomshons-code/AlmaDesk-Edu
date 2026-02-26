const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createUniversalTemplate() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!admin) {
      console.log('No admin found!');
      return;
    }

    const template = await prisma.responseTemplate.create({
      data: {
        title: 'Potwierdzenie zgłoszenia',
        content: 'Witaj,\n\nDziękujemy za zgłoszenie. Twoje zgłoszenie zostało przyjęte i jest aktualnie przetwarzane przez nasz zespół.\n\nOczekiwany czas reakcji: 24h\n\nPozdrawiamy,\nZespół AlmaDesk',
        category: null,
        isPublic: true,
        createdById: admin.id
      }
    });

    console.log('[Template] Created universal template:', template.title);
    console.log('   ID:', template.id);
    console.log('   Category: UNIVERSAL (null)');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUniversalTemplate();
