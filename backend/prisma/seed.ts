import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('0808', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'memories@gmail.com' },
    update: {
      password: hashedPassword,
      name: 'memories'
    },
    create: {
      email: 'memories@gmail.com',
      password: hashedPassword,
      name: 'memories'
    },
  });

  console.log('Seeded User:', user.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });