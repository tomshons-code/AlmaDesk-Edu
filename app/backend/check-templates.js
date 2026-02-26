const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    const templates = await prisma.responseTemplate.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    console.log('===== TEMPLATES IN DATABASE =====');
    console.log(`Total count: ${templates.length}`);
    console.log('');

    templates.forEach((t, idx) => {
      console.log(`#${idx + 1}: ${t.title}`);
      console.log(`  ID: ${t.id}`);
      console.log(`  Category: ${t.category || 'UNIVERSAL (null)'}`);
      console.log(`  isPublic: ${t.isPublic}`);
      console.log(`  Created by: ${t.createdBy.name} (${t.createdBy.role})`);
      console.log(`  Content: ${t.content.substring(0, 50)}...`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();
