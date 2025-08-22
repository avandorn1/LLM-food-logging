const { PrismaClient } = require('@prisma/client');

// Try different URL encoding approaches
const urls = [
  "postgresql://postgres:Lidar_R00f_left!!@db.cvfwbqujlzzheocstrur.supabase.co:5432/postgres",
  "postgresql://postgres:Lidar_R00f_left%21%21@db.cvfwbqujlzzheocstrur.supabase.co:5432/postgres",
  "postgresql://postgres:Lidar_R00f_left%21%21@db.cvfwbqujlzzheocstrur.supabase.co:5432/postgres?sslmode=require"
];

async function testConnection(url, index) {
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    console.log(`\n--- Testing URL ${index + 1} ---`);
    console.log('URL:', url);
    
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('✅ Connection successful!');
    console.log('Database info:', result);
    
    const userCount = await prisma.user.count();
    console.log(`User count: ${userCount}`);
    
    return true;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function testAll() {
  for (let i = 0; i < urls.length; i++) {
    const success = await testConnection(urls[i], i);
    if (success) {
      console.log(`\n🎉 URL ${i + 1} works! Use this one.`);
      break;
    }
  }
}

testAll();
