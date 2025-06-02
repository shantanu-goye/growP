import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Lokeshadmin@987412', 10);

  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      name: 'Lokesh Chaudhary',
      email: 'chaudharylokesh53284@gmail.com',
      password: hashedPassword,
      role: 'superadmin',
    },
  });

  console.log('✅ Super admin created:', superAdmin);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
