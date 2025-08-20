import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { startOfDay, subDays } from "date-fns";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

export async function GET(req: NextRequest) {
  try {
    // Get user's goals and recent logs
    const user = await prisma.user.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });

    const goals = await prisma.goal.findUnique({
      where: { userId: user.id },
    });

    // Use Eastern Time for date calculations
    const now = new Date();
    const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
    const end = startOfDay(easternDate);
    const start = startOfDay(subDays(end, 7)); // Last 7 days

    const recentLogs = await prisma.foodLog.findMany({
      where: {
        userId: user.id,
        loggedAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { loggedAt: "asc" },
    });

    // Group logs by day
    const logsByDay = new Map();
    for (let i = 0; i < 7; i++) {
      const day = startOfDay(subDays(end, 6 - i));
      const key = day.toISOString().slice(0, 10);
      logsByDay.set(key, []);
    }

    for (const log of recentLogs) {
      const key = log.loggedAt.toISOString().slice(0, 10);
      if (logsByDay.has(key)) {
        logsByDay.get(key).push(log);
      }
    }

    // Calculate daily totals
    const dailyTotals = Array.from(logsByDay.entries()).map(([day, logs]) => {
      const totals = logs.reduce(
        (acc, log) => ({
          calories: acc.calories + (log.calories || 0),
          protein: acc.protein + (log.protein || 0),
          carbs: acc.carbs + (log.carbs || 0),
          fat: acc.fat + (log.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      return { day, totals, logs };
    });

    // Calculate averages
    const nonZeroDays = dailyTotals.filter(d => d.totals.calories > 0);
    const avgCalories = nonZeroDays.length > 0 ? Math.round(nonZeroDays.reduce((sum, d) => sum + d.totals.calories, 0) / nonZeroDays.length) : 0;
    const avgProtein = nonZeroDays.length > 0 ? Math.round(nonZeroDays.reduce((sum, d) => sum + d.totals.protein, 0) / nonZeroDays.length) : 0;
    const avgCarbs = nonZeroDays.length > 0 ? Math.round(nonZeroDays.reduce((sum, d) => sum + d.totals.carbs, 0) / nonZeroDays.length) : 0;
    const avgFat = nonZeroDays.length > 0 ? Math.round(nonZeroDays.reduce((sum, d) => sum + d.totals.fat, 0) / nonZeroDays.length) : 0;

    // Calculate consistency
    const targetCalories = goals?.targetCalories || 2000;
    const daysInSweetSpot = nonZeroDays.filter(d => 
      d.totals.calories >= targetCalories * 0.9 && d.totals.calories <= targetCalories * 1.1
    ).length;
    const consistency = nonZeroDays.length > 0 ? Math.round((daysInSweetSpot / nonZeroDays.length) * 100) : 0;

    const client = getOpenAIClient();
    
    const systemPrompt = `You are a supportive nutrition coach reviewing a user's recent progress. Generate a brief, encouraging progress review (3-4 sentences) based on their nutrition data from the past week.

Be positive and motivating, but realistic. Consider:
- Their consistency in logging and hitting calorie targets
- How their average intake compares to their goals
- Progress on macro balance (protein, carbs, fat)
- Specific food patterns or choices you notice
- Areas where they're doing well and potential improvements

Be specific and actionable. For example:
- "You've been really consistent with logging 5 out of 7 days - that's awesome!"
- "Your protein intake is averaging 45% which is perfect for your high-protein goals"
- "I notice you're often under on calories - maybe try adding some healthy snacks"
- "Great job hitting your sweet spot 3 days this week!"

Keep it conversational, warm, and encouraging. Focus on progress and building sustainable habits.`;

    const userPrompt = `User's nutrition data for the past 7 days:
- Days logged: ${nonZeroDays.length}/7
- Average calories: ${avgCalories} / ${goals?.targetCalories || 'not set'} target
- Average protein: ${avgProtein}g / ${goals?.targetProtein || 'not set'}g target
- Average carbs: ${avgCarbs}g / ${goals?.targetCarbs || 'not set'}g target
- Average fat: ${avgFat}g / ${goals?.targetFat || 'not set'}g target
- Days in sweet spot (90-110% of target): ${daysInSweetSpot}/${nonZeroDays.length} (${consistency}%)

Recent food items: ${recentLogs.map(log => log.item).slice(0, 20).join(', ')}

Daily breakdown:
${dailyTotals.map(d => `- ${d.day}: ${d.totals.calories} cal, ${d.totals.protein}g protein, ${d.totals.carbs}g carbs, ${d.totals.fat}g fat`).join('\n')}

Generate a brief progress review:`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const message = completion.choices[0]?.message?.content?.trim() || 
      "You're making great progress with your nutrition journey! Keep up the consistent logging and healthy choices.";

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error generating progress review:", error);
    return NextResponse.json({ 
      message: "You're making great progress with your nutrition journey! Keep up the consistent logging and healthy choices." 
    });
  }
}
