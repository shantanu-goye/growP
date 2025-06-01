import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Mn@8087840656', 10);

  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'growp4681@gmail.com',
      password: hashedPassword,
      role: 'superadmin',
    },
  });

  console.log('✅ Super admin created:', superAdmin);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
