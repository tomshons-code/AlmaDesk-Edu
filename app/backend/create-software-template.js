const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSoftwareTemplate() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    const template = await prisma.responseTemplate.create({
      data: {
        title: 'Problem z oprogramowaniem',
        content: 'Witaj,\n\nW celu rozwiązania problemu z oprogramowaniem, prosimy o:\n1. Zrestartowanie aplikacji\n2. Sprawdzenie czy masz najnowszą wersję\n3. Wysłanie logów (jeśli występuje błąd)\n\nPozdrawiamy\nZespół AlmaDesk',
        category: 'SOFTWARE',
        isPublic: true,
        createdById: admin.id
      }
    });

    console.log('[Template] Created SOFTWARE template:', template.title);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSoftwareTemplate();
