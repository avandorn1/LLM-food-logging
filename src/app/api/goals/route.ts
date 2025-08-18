import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const GoalsSchema = z.object({
  userId: z.number().optional(),
  targetCalories: z.number().int().nullable().optional(),
  targetProtein: z.number().int().nullable().optional(),
  targetCarbs: z.number().int().nullable().optional(),
  targetFat: z.number().int().nullable().optional(),
  macroSplit: z.string().nullable().optional(),
});

const BioSchema = z.object({
  age: z.number().int().nullable().optional(),
  biologicalSex: z.string().nullable().optional(),
  height: z.number().int().nullable().optional(),
  weight: z.number().int().nullable().optional(),
  activityLevel: z.string().nullable().optional(),
});

const GoalSettingsSchema = z.object({
  goalType: z.string().nullable().optional(),
  pace: z.string().nullable().optional(),
});

const RequestSchema = z.object({
  goal: GoalsSchema.optional(),
  bio: BioSchema.optional(),
  goalSettings: GoalSettingsSchema.optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = Number(searchParams.get("userId") || 1);
  const goal = await prisma.goal.findUnique({ where: { userId } });
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { age: true, biologicalSex: true, height: true, weight: true, activityLevel: true }
  });
  
  // Temporarily return default goal settings until Prisma is fixed
  const goalSettings = { goalType: 'maintain', pace: 'lose-moderate' };
  
  return NextResponse.json({ goal, bio: user, goalSettings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal: goalData, bio: bioData, goalSettings: goalSettingsData } = RequestSchema.parse(body);
    const userId = 1; // Default user ID
    
    // Update or create user with bio data
    const user = await prisma.user.upsert({ 
      where: { id: userId }, 
      update: bioData || {}, 
      create: { id: userId, ...bioData } 
    });
    
    // Update or create goal (temporarily without goal settings until Prisma is fixed)
    const goal = goalData ? await prisma.goal.upsert({
      where: { userId },
      update: { 
        ...goalData
        // goalSettings: goalSettingsData ? JSON.stringify(goalSettingsData) : null 
      },
      create: { 
        userId, 
        ...goalData
        // goalSettings: goalSettingsData ? JSON.stringify(goalSettingsData) : null 
      },
    }) : null;
    
    return NextResponse.json({ goal, bio: user, goalSettings: goalSettingsData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


