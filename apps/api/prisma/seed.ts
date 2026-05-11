import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log(
    'Seed vazio aplicado: nenhum tenant, usuario, sala, jogador ou sorteio demo foi criado.',
  );
  console.log('Primeiro uso: crie a organizacao inicial em POST /api/v1/tenants ou pela tela de login.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
