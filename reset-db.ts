import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reset() {
  console.log('Resetting Cafe POS database to clean slate...');
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.menuCategory.deleteMany({});
  await prisma.cafeTable.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.businessSettings.deleteMany({});
  console.log('✓ Database is now completely fresh.');
  console.log('✓ Visiting http://localhost:3000 will now open the initial /setup wizard.');
}

reset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
