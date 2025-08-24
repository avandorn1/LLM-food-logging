const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const demoData = [
  // August 19, 2025
  {
    day: new Date('2025-08-19'),
    items: [
      { item: 'Oatmeal with berries and nuts', mealType: 'breakfast', calories: 450, protein: 15, carbs: 65, fat: 18 },
      { item: 'Grilled chicken salad with dressing', mealType: 'lunch', calories: 520, protein: 42, carbs: 25, fat: 28 },
      { item: 'Greek yogurt with granola', mealType: 'snack', calories: 280, protein: 20, carbs: 35, fat: 8 },
      { item: 'Salmon with rice and vegetables', mealType: 'dinner', calories: 680, protein: 48, carbs: 55, fat: 32 }
    ]
  },
  // August 20, 2025
  {
    day: new Date('2025-08-20'),
    items: [
      { item: 'Eggs, bacon, and whole grain toast', mealType: 'breakfast', calories: 520, protein: 25, carbs: 35, fat: 28 },
      { item: 'Turkey sandwich with chips', mealType: 'lunch', calories: 580, protein: 35, carbs: 65, fat: 22 },
      { item: 'Apple with peanut butter', mealType: 'snack', calories: 280, protein: 8, carbs: 35, fat: 12 },
      { item: 'Pasta with meat sauce and bread', mealType: 'dinner', calories: 620, protein: 28, carbs: 85, fat: 18 }
    ]
  },
  // August 21, 2025
  {
    day: new Date('2025-08-21'),
    items: [
      { item: 'Smoothie bowl with granola', mealType: 'breakfast', calories: 420, protein: 18, carbs: 55, fat: 15 },
      { item: 'Quinoa bowl with chicken and vegetables', mealType: 'lunch', calories: 480, protein: 32, carbs: 65, fat: 18 },
      { item: 'Mixed nuts and dried fruit', mealType: 'snack', calories: 320, protein: 10, carbs: 25, fat: 22 },
      { item: 'Beef stir fry with rice', mealType: 'dinner', calories: 680, protein: 45, carbs: 55, fat: 28 }
    ]
  },
  // August 22, 2025
  {
    day: new Date('2025-08-22'),
    items: [
      { item: 'Pancakes with syrup and butter', mealType: 'breakfast', calories: 480, protein: 12, carbs: 75, fat: 18 },
      { item: 'Caesar salad with chicken and croutons', mealType: 'lunch', calories: 520, protein: 38, carbs: 35, fat: 28 },
      { item: 'Protein bar and banana', mealType: 'snack', calories: 320, protein: 25, carbs: 35, fat: 10 },
      { item: 'Pizza with toppings', mealType: 'dinner', calories: 580, protein: 25, carbs: 65, fat: 22 }
    ]
  },
  // August 23, 2025
  {
    day: new Date('2025-08-23'),
    items: [
      { item: 'Avocado toast with eggs', mealType: 'breakfast', calories: 420, protein: 18, carbs: 40, fat: 22 },
      { item: 'Tuna salad sandwich with chips', mealType: 'lunch', calories: 520, protein: 32, carbs: 55, fat: 20 },
      { item: 'Banana with almond butter', mealType: 'snack', calories: 280, protein: 8, carbs: 35, fat: 12 },
      { item: 'Grilled steak with potatoes and vegetables', mealType: 'dinner', calories: 680, protein: 52, carbs: 45, fat: 28 }
    ]
  }
];

async function addDemoData() {
  try {
    console.log('Adding demo data to production database...');
    
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
    
    console.log('✅ Demo data added successfully!');
    
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
    
    console.log(`Total food logs added: ${totalLogs}`);
    
  } catch (error) {
    console.error('Error adding demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDemoData();
