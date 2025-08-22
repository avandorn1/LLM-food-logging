const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
  try {
    console.log('🔄 Exporting data from local SQLite database...');
    
    // Export users
    const users = await prisma.user.findMany();
    console.log(`📊 Found ${users.length} users`);
    
    // Export goals
    const goals = await prisma.goal.findMany();
    console.log(`🎯 Found ${goals.length} goals`);
    
    // Export food logs
    const foodLogs = await prisma.foodLog.findMany({
      orderBy: { loggedAt: 'asc' }
    });
    console.log(`🍎 Found ${foodLogs.length} food logs`);
    
    // Create export object
    const exportData = {
      users,
      goals,
      foodLogs,
      exportDate: new Date().toISOString(),
      totalRecords: users.length + goals.length + foodLogs.length
    };
    
    // Write to file
    const exportPath = path.join(__dirname, '..', 'exported-data.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Data exported to: ${exportPath}`);
    console.log(`📈 Summary:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Goals: ${goals.length}`);
    console.log(`   - Food Logs: ${foodLogs.length}`);
    console.log(`   - Total Records: ${exportData.totalRecords}`);
    
    // Show sample data
    if (foodLogs.length > 0) {
      console.log(`\n📋 Sample food log entries:`);
      foodLogs.slice(0, 3).forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.item} - ${log.calories} cal (${log.loggedAt})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error exporting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
