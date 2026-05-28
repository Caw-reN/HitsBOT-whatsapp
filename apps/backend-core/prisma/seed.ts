import dotenv from 'dotenv';
dotenv.config();

import { getPrisma, disconnectPrisma } from '../src/prisma.js';

const prisma = getPrisma();

async function main() {
  console.log('🌱 Starting Prisma seeding...');

  const defaultUsername = 'admin';
  const defaultPassword = 'admin123';

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { username: defaultUsername },
  });

  if (existingAdmin) {
    console.log(`⚠️ Admin user "${defaultUsername}" already exists. Skipping.`);
  } else {
    console.log(`👤 Creating default admin user: "${defaultUsername}"`);
    // Hash password with bcrypt
    const bcrypt = await import('bcrypt').then((m) => m.default || m);
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    await prisma.admin.create({
      data: {
        username: defaultUsername,
        password: hashedPassword,
      },
    });

    console.log('✅ Default admin user successfully created.');
  }

  console.log('🌱 Seeding finished.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
