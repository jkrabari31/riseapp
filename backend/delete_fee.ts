import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.feeStructure.deleteMany({});
    console.log('Deleted fee structures');
}

main().catch(console.error).finally(() => prisma.$disconnect());
