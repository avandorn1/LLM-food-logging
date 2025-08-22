const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection successful!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Your Supabase project is active');
    console.log('2. The database schema is created');
    console.log('3. The connection string is correct');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
