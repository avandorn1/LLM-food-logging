const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Set the connection string directly
process.env.DATABASE_URL = "postgresql://postgres:Lidar_R00f_left%21%21@db.cvfwbqujlzzheocstrur.supabase.co:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function importData() {
  try {
    console.log('🔄 Importing data to Supabase...');
    console.log('Connection URL:', process.env.DATABASE_URL);
    
    // Read exported data
    const exportPath = path.join(__dirname, '..', 'exported-data.json');
    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    
    console.log(`📊 Found ${exportData.totalRecords} records to import`);
    
    // Test connection first
    console.log('🔍 Testing connection...');
    const testResult = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection test successful:', testResult);
    
    // Import users
    console.log('\n👥 Importing users...');
    for (const user of exportData.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user
      });
      console.log(`   ✅ User ${user.id} imported`);
    }
    
    // Import goals
    console.log('\n🎯 Importing goals...');
    for (const goal of exportData.goals) {
      await prisma.goal.upsert({
        where: { userId: goal.userId },
        update: goal,
        create: goal
      });
      console.log(`   ✅ Goal for user ${goal.userId} imported`);
    }
    
    // Import food logs
    console.log('\n🍎 Importing food logs...');
    let importedCount = 0;
    for (const log of exportData.foodLogs) {
      await prisma.foodLog.create({
        data: {
          userId: log.userId,
          loggedAt: new Date(log.loggedAt),
          day: new Date(log.day),
          item: log.item,
          mealType: log.mealType,
          quantity: log.quantity,
          unit: log.unit,
          calories: log.calories,
          protein: log.protein,
          carbs: log.carbs,
          fat: log.fat,
          fiber: log.fiber,
          sugar: log.sugar,
          sodium: log.sodium,
          notes: log.notes,
          createdAt: new Date(log.createdAt)
        }
      });
      importedCount++;
      if (importedCount % 10 === 0) {
        console.log(`   ✅ Imported ${importedCount}/${exportData.foodLogs.length} food logs`);
      }
    }
    
    console.log(`\n🎉 Import completed successfully!`);
    console.log(`📈 Summary:`);
    console.log(`   - Users imported: ${exportData.users.length}`);
    console.log(`   - Goals imported: ${exportData.goals.length}`);
    console.log(`   - Food logs imported: ${exportData.foodLogs.length}`);
    console.log(`   - Total records: ${exportData.totalRecords}`);
    
    console.log(`\n🔗 Your data is now available on your live website!`);
    
  } catch (error) {
    console.error('❌ Error importing data:', error);
    console.log('\n💡 Connection details:');
    console.log('URL:', process.env.DATABASE_URL);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
