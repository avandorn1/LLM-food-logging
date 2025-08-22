const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:Lidar_R00f_left%21%21@db.cvfwbqujlzzheocstrur.supabase.co:5432/postgres"
    }
  }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('Connection successful!');
    console.log('Database info:', result);
    
    // Test if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('User', 'Goal', 'FoodLog')
    `;
    console.log('Tables found:', tables);
    
    // Test if data exists
    const userCount = await prisma.user.count();
    const goalCount = await prisma.goal.count();
    const foodLogCount = await prisma.foodLog.count();
    
    console.log(`User count: ${userCount}`);
    console.log(`Goal count: ${goalCount}`);
    console.log(`Food log count: ${foodLogCount}`);
    
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
