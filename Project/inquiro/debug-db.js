const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const knowledgePairs = await prisma.knowledgePair.findMany();
    console.log('Total knowledge pairs:', knowledgePairs.length);
    console.log('\nKnowledge pairs:');
    knowledgePairs.forEach((kp, index) => {
      console.log(`${index + 1}. Q: ${kp.question}`);
      console.log(`   A: ${kp.answer.substring(0, 100)}...`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 