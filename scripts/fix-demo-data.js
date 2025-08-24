const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const demoData = [
  // August 19, 2025 - Total: ~1850 calories (light day)
  {
    day: new Date('2025-08-19'),
    items: [
      { item: 'Oatmeal with berries', mealType: 'breakfast', calories: 380, protein: 12, carbs: 55, fat: 12 },
      { item: 'Grilled chicken salad', mealType: 'lunch', calories: 420, protein: 35, carbs: 20, fat: 18 },
      { item: 'Greek yogurt with honey', mealType: 'snack', calories: 180, protein: 15, carbs: 20, fat: 3 },
      { item: 'Salmon with vegetables', mealType: 'dinner', calories: 870, protein: 48, carbs: 65, fat: 28 }
    ]
  },
  // August 20, 2025 - Total: ~2100 calories (normal day)
  {
    day: new Date('2025-08-20'),
    items: [
      { item: 'Eggs and whole grain toast with avocado', mealType: 'breakfast', calories: 520, protein: 22, carbs: 45, fat: 28 },
      { item: 'Turkey sandwich with chips', mealType: 'lunch', calories: 580, protein: 35, carbs: 65, fat: 22 },
      { item: 'Apple with almond butter', mealType: 'snack', calories: 240, protein: 6, carbs: 35, fat: 12 },
      { item: 'Pasta with marinara and meatballs', mealType: 'dinner', calories: 760, protein: 28, carbs: 95, fat: 18 }
    ]
  },
  // August 21, 2025 - Total: ~1950 calories (moderate day)
  {
    day: new Date('2025-08-21'),
    items: [
      { item: 'Smoothie bowl with granola', mealType: 'breakfast', calories: 420, protein: 18, carbs: 55, fat: 16 },
      { item: 'Quinoa bowl with chicken and vegetables', mealType: 'lunch', calories: 520, protein: 32, carbs: 65, fat: 18 },
      { item: 'Mixed nuts and dried fruit', mealType: 'snack', calories: 280, protein: 8, carbs: 25, fat: 20 },
      { item: 'Beef stir fry with noodles', mealType: 'dinner', calories: 730, protein: 42, carbs: 75, fat: 24 }
    ]
  },
  // August 22, 2025 - Total: ~2200 calories (heavier day)
  {
    day: new Date('2025-08-22'),
    items: [
      { item: 'Pancakes with maple syrup and butter', mealType: 'breakfast', calories: 580, protein: 12, carbs: 75, fat: 20 },
      { item: 'Caesar salad with chicken and croutons', mealType: 'lunch', calories: 620, protein: 38, carbs: 35, fat: 35 },
      { item: 'Protein bar and banana', mealType: 'snack', calories: 300, protein: 22, carbs: 35, fat: 12 },
      { item: 'Pizza slice with side salad', mealType: 'dinner', calories: 700, protein: 25, carbs: 75, fat: 25 }
    ]
  },
  // August 23, 2025 - Total: ~2050 calories (normal day)
  {
    day: new Date('2025-08-23'),
    items: [
      { item: 'Avocado toast with eggs', mealType: 'breakfast', calories: 480, protein: 18, carbs: 45, fat: 28 },
      { item: 'Tuna salad sandwich with chips', mealType: 'lunch', calories: 540, protein: 32, carbs: 55, fat: 22 },
      { item: 'Banana with peanut butter and honey', mealType: 'snack', calories: 280, protein: 8, carbs: 40, fat: 12 },
      { item: 'Grilled steak with mashed potatoes', mealType: 'dinner', calories: 750, protein: 52, carbs: 55, fat: 28 }
    ]
  }
];

async function fixDemoData() {
  try {
    console.log('Clearing existing demo data...');
    
    // Get today's date to clear any logs that were created today
    const now = new Date();
    const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
    const today = easternDate.toISOString().slice(0, 10);
    
    // Delete existing food logs for these dates AND any logs created today
    await prisma.foodLog.deleteMany({
      where: {
        userId: 1,
        OR: [
          {
            day: {
              gte: new Date('2025-08-19'),
              lte: new Date('2025-08-23')
            }
          },
          {
            loggedAt: {
              gte: new Date(`${today}T00:00:00`),
              lt: new Date(`${today}T23:59:59`)
            }
          }
        ]
      }
    });
    
    console.log('Existing data cleared. Adding new demo data...');
    
    // Ensure user exists
    const user = await prisma.user.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Demo User' }
    });
    
    console.log('User ensured:', user.id);
    
    // Add food logs for each day
    for (const dayData of demoData) {
      console.log(`Adding data for ${dayData.day.toDateString()}...`);
      
      for (const item of dayData.items) {
        await prisma.foodLog.create({
          data: {
            userId: 1,
            day: dayData.day,
            loggedAt: dayData.day, // Set loggedAt to match the day
            item: item.item,
            mealType: item.mealType,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            quantity: 1,
            unit: 'serving'
          }
        });
      }
      
      // Calculate total calories for the day
      const totalCalories = dayData.items.reduce((sum, item) => sum + item.calories, 0);
      console.log(`  Total calories for ${dayData.day.toDateString()}: ${totalCalories}`);
    }
    
    console.log('✅ Demo data fixed successfully!');
    
    // Show summary
    const totalLogs = await prisma.foodLog.count({
      where: {
        userId: 1,
        day: {
          gte: new Date('2025-08-19'),
          lte: new Date('2025-08-23')
        }
      }
    });
    
    console.log(`Total food logs: ${totalLogs}`);
    
  } catch (error) {
    console.error('Error fixing demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDemoData();
