import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@local.com';
  const adminPass = 'admin123';
  // migrate legacy admin email if needed
  const legacyAdmin = await prisma.user.findUnique({ where: { email: 'admin@local' } });
  if (legacyAdmin) {
    await prisma.user.update({ where: { id: legacyAdmin.id }, data: { email: adminEmail } });
  }
  let existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPass, 10);
    existingAdmin = await prisma.user.create({
      data: {
        name: 'Администратор',
        email: adminEmail,
        passwordHash,
        role: 'MANAGER',
      },
    });
  }

  const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });

  const engineerEmail = 'eng@local.com';
  const legacyEng = await prisma.user.findUnique({ where: { email: 'eng@local' } });
  if (legacyEng) {
    await prisma.user.update({ where: { id: legacyEng.id }, data: { email: engineerEmail } });
  }
  let engineer = await prisma.user.findUnique({ where: { email: engineerEmail } });
  if (!engineer) {
    engineer = await prisma.user.create({
      data: {
        name: 'Инженер',
        email: engineerEmail,
        passwordHash: await bcrypt.hash('eng12345', 10),
        role: 'ENGINEER',
      },
    });
  }

  const project = await prisma.project.create({ data: { name: 'Объект №1', description: 'Демо объект' } });

  const stage1 = await prisma.stage.upsert({
    where: { projectId_name: { projectId: project.id, name: 'Черновые работы' } },
    update: {},
    create: { projectId: project.id, name: 'Черновые работы', position: 1 },
  });

  const defect = await prisma.defect.create({
    data: {
      title: 'Трещина в стене',
      description: 'Обнаружена вертикальная трещина в стене на 3 этаже',
      priority: 'HIGH',
      status: 'NEW',
      projectId: project.id,
      stageId: stage1.id,
      reporterId: manager!.id,
      assigneeId: engineer.id,
    },
  });

  await prisma.comment.create({
    data: {
      defectId: defect.id,
      authorId: engineer.id,
      content: 'Принято в работу',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seeding complete');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


