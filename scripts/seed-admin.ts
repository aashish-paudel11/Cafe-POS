import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const fullName = process.env.ADMIN_NAME || 'Cafe Administrator';
  const cafeName = process.env.CAFE_NAME || 'My Cafe';

  console.log('----------------------------------------------------');
  console.log('PROVISIONING CAFE POS ADMINISTRATOR ACCOUNT');
  console.log('----------------------------------------------------');

  const passwordHash = await bcrypt.hash(password, 12);

  // Upsert Admin User
  const admin = await prisma.user.upsert({
    where: { username },
    create: {
      username,
      fullName,
      passwordHash,
      role: 'admin',
      isActive: true,
    },
    update: {
      fullName,
      passwordHash,
      role: 'admin',
      isActive: true,
    },
  });

  // Ensure default BusinessSettings exist
  await prisma.businessSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      cafeName,
      currency: 'NPR',
      timezone: 'Asia/Kathmandu',
      receiptPaperSize: '80mm',
      receiptFooter: 'Thank you for visiting!',
      taxNote: 'All prices are inclusive of applicable taxes.',
    },
    update: {},
  });

  console.log('✓ Administrator Account Ready:');
  console.log(`  - Full Name: ${admin.fullName}`);
  console.log(`  - Username:  ${admin.username}`);
  console.log(`  - Password:  ${password}`);
  console.log('\n✓ Hand these credentials to the cafe owner.');
  console.log('✓ The owner can log in and immediately change their password under "My Account".');
  console.log('----------------------------------------------------');
}

seedAdmin()
  .catch((e) => {
    console.error('Failed to provision administrator:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
