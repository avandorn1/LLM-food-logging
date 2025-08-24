const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCalories() {
  try {
    console.log('Debugging calorie discrepancy...');
    
    // Get today's date in Eastern Time
    const now = new Date();
    const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
    const today = easternDate.toISOString().slice(0, 10);
    
    console.log('Today (Eastern):', today);
    
    // Get all logs for today
    const logs = await prisma.foodLog.findMany({
      where: {
        userId: 1,
        day: {
          gte: new Date(`${today}T00:00:00`),
          lt: new Date(`${today}T23:59:59`)
        }
      },
      orderBy: { loggedAt: 'asc' }
    });
    
    console.log(`\nFound ${logs.length} food logs for today:`);
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    logs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.item} - ${log.calories} cal, ${log.protein}g protein, ${log.carbs}g carbs, ${log.fat}g fat`);
      totalCalories += log.calories || 0;
      totalProtein += log.protein || 0;
      totalCarbs += log.carbs || 0;
      totalFat += log.fat || 0;
    });
    
    console.log(`\nTotals for today:`);
    console.log(`Calories: ${totalCalories}`);
    console.log(`Protein: ${totalProtein}g`);
    console.log(`Carbs: ${totalCarbs}g`);
    console.log(`Fat: ${totalFat}g`);
    
    // Check if there are any logs with loggedAt for today
    const logsByLoggedAt = await prisma.foodLog.findMany({
      where: {
        userId: 1,
        loggedAt: {
          gte: new Date(`${today}T00:00:00`),
          lt: new Date(`${today}T23:59:59`)
        }
      },
      orderBy: { loggedAt: 'asc' }
    });
    
    console.log(`\nFound ${logsByLoggedAt.length} food logs by loggedAt for today:`);
    
    let totalCaloriesByLoggedAt = 0;
    logsByLoggedAt.forEach((log, index) => {
      console.log(`${index + 1}. ${log.item} - ${log.calories} cal (loggedAt: ${log.loggedAt})`);
      totalCaloriesByLoggedAt += log.calories || 0;
    });
    
    console.log(`\nTotal calories by loggedAt: ${totalCaloriesByLoggedAt}`);
    
    // Check the last 5 days to see the pattern
    console.log('\n=== Last 5 days summary ===');
    for (let i = 4; i >= 0; i--) {
      const date = new Date(easternDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      
      const dayLogs = await prisma.foodLog.findMany({
        where: {
          userId: 1,
          day: {
            gte: new Date(`${dateStr}T00:00:00`),
            lt: new Date(`${dateStr}T23:59:59`)
          }
        }
      });
      
      const dayTotal = dayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
      console.log(`${dateStr}: ${dayLogs.length} items, ${dayTotal} calories`);
    }
    
  } catch (error) {
    console.error('Error debugging calories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCalories();
