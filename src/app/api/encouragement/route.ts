import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  try {
    // Get user's goals and today's logs
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
    
    const todayLogs = await prisma.foodLog.findMany({
      where: {
        userId: user.id,
        loggedAt: {
          gte: startOfDay(easternDate),
          lt: new Date(startOfDay(easternDate).getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { loggedAt: "asc" },
    });

    const todayTotals = todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fat: acc.fat + (log.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const remaining = {
      calories: (goals?.targetCalories || 0) - todayTotals.calories,
      protein: (goals?.targetProtein || 0) - todayTotals.protein,
      carbs: (goals?.targetCarbs || 0) - todayTotals.carbs,
      fat: (goals?.targetFat || 0) - todayTotals.fat,
    };

    const client = getOpenAIClient();
    
    const systemPrompt = `You are a supportive nutrition coach. Generate a brief, encouraging message (2-3 sentences) based on the user's nutrition data for today. 

Be positive and motivating, but realistic. Consider:
- If they're on track with their goals
- If they've logged food today
- Their progress toward calorie/macro targets
- General encouragement for healthy habits

Keep it conversational and warm. Don't be overly technical.`;

    const userPrompt = `User's nutrition data for today:
- Logged items: ${todayLogs.length} items
- Calories consumed: ${todayTotals.calories} / ${goals?.targetCalories || 'not set'} target
- Protein: ${todayTotals.protein}g / ${goals?.targetProtein || 'not set'}g target
- Carbs: ${todayTotals.carbs}g / ${goals?.targetCarbs || 'not set'}g target
- Fat: ${todayTotals.fat}g / ${goals?.targetFat || 'not set'}g target

Generate a brief encouragement message:`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const message = completion.choices[0]?.message?.content?.trim() || 
      "You're doing great with your nutrition journey! Keep up the amazing work.";

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error generating encouragement:", error);
    return NextResponse.json({ 
      message: "You're doing great with your nutrition journey! Keep up the amazing work." 
    });
  }
}
