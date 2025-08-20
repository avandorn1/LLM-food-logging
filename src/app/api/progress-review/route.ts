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
    const today = startOfDay(easternDate);
    const end = startOfDay(today); // Today (end of analysis period - exclusive)
    const start = startOfDay(subDays(end, 7)); // 7 days before today (start of analysis period)

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



    // Group logs by day - simpler approach
    const logsByDay = new Map();
    
    for (const log of recentLogs) {
      // Use day field if available, otherwise fall back to loggedAt
      const logDate = log.day || log.loggedAt;
      const key = logDate.toISOString().slice(0, 10);
      
      if (!logsByDay.has(key)) {
        logsByDay.set(key, []);
      }
      logsByDay.get(key).push(log);
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



    // Calculate averages - consider any day with logging as complete
    const targetCalories = goals?.targetCalories || 2000;
    const completeDays = dailyTotals.filter(d => d.totals.calories > 0);
    const zeroDays = dailyTotals.filter(d => d.totals.calories === 0);
    
    const avgCalories = completeDays.length > 0 ? Math.round(completeDays.reduce((sum, d) => sum + d.totals.calories, 0) / completeDays.length) : 0;
    const avgProtein = completeDays.length > 0 ? Math.round(completeDays.reduce((sum, d) => sum + d.totals.protein, 0) / completeDays.length) : 0;
    const avgCarbs = completeDays.length > 0 ? Math.round(completeDays.reduce((sum, d) => sum + d.totals.carbs, 0) / completeDays.length) : 0;
    const avgFat = completeDays.length > 0 ? Math.round(completeDays.reduce((sum, d) => sum + d.totals.fat, 0) / completeDays.length) : 0;

    // Calculate consistency (only for complete days)
    const daysInSweetSpot = completeDays.filter(d => 
      d.totals.calories >= targetCalories * 0.9 && d.totals.calories <= targetCalories * 1.1
    ).length;
    const consistency = completeDays.length > 0 ? Math.round((daysInSweetSpot / completeDays.length) * 100) : 0;

    const client = getOpenAIClient();
    
    const systemPrompt = `You are a supportive nutrition coach reviewing a user's recent progress. Generate a brief, encouraging progress review (3-4 sentences) based on their nutrition data from the past week.

Be positive and motivating, but realistic. Consider:
- Their consistency in logging and hitting calorie targets
- How their average intake compares to their goals
- Progress on macro balance (protein, carbs, fat)
- Specific food patterns or choices you notice
- Areas where they're doing well and potential improvements

IMPORTANT: Do NOT mention specific calorie amounts, macro gram amounts, or exact percentages. Instead, give directional advice like:
- "You're doing great with consistency - keep it up!"
- "Your protein intake could use a boost - try adding more protein-rich foods"
- "You're hitting your sweet spot regularly - excellent work!"
- "Consider adding some healthy snacks to reach your targets"
- "Your macro balance is looking good overall"

Keep it conversational, warm, and encouraging. Focus on progress and building sustainable habits without getting into specific numbers.`;

    const userPrompt = `User's nutrition data for the previous 7 days (excluding today):
- Days with logging: ${completeDays.length}/7
- Days with no logging: ${zeroDays.length}/7
- Average calories: ${avgCalories} / ${goals?.targetCalories || 'not set'} target
- Average protein: ${avgProtein}g / ${goals?.targetProtein || 'not set'}g target
- Average carbs: ${avgCarbs}g / ${goals?.targetCarbs || 'not set'}g target
- Average fat: ${avgFat}g / ${goals?.targetFat || 'not set'}g target
- Days in sweet spot (90-110% of target): ${daysInSweetSpot}/${completeDays.length} (${consistency}%)

Recent food items: ${recentLogs.map(log => log.item).slice(0, 20).join(', ')}

Daily breakdown:
${dailyTotals.map(d => {
  const status = d.totals.calories > 0 ? '(logged)' : '(no logging)';
  return `- ${d.day}: ${d.totals.calories} cal, ${d.totals.protein}g protein, ${d.totals.carbs}g carbs, ${d.totals.fat}g fat ${status}`;
}).join('\n')}

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
