import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay, subDays } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days") || 7);
    const userId = Number(searchParams.get("userId") || 1);
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 7;

    // Use Eastern Time for date calculations
  const now = new Date();
  const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
  const end = startOfDay(easternDate);
    const start = startOfDay(subDays(end, days - 1));

    const [logs, goal] = await Promise.all([
      prisma.foodLog.findMany({
        where: { userId, day: { gte: start, lte: end } },
        orderBy: { day: "asc" },
      }),
      prisma.goal.findUnique({ where: { userId } }),
    ]);

    const byDay = new Map<string, { day: string; calories: number; protein: number; carbs: number; fat: number; loggedItems: number }>();
    for (let i = 0; i < days; i++) {
      const d = startOfDay(subDays(end, days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { day: key, calories: 0, protein: 0, carbs: 0, fat: 0, loggedItems: 0 });
    }

    for (const l of logs) {
      const key = l.day.toISOString().slice(0, 10);
      const acc = byDay.get(key);
      if (!acc) continue;
      acc.calories += l.calories ?? 0;
      acc.protein += l.protein ?? 0;
      acc.carbs += l.carbs ?? 0;
      acc.fat += l.fat ?? 0;
      acc.loggedItems += 1;
    }

    const series = Array.from(byDay.values());
    return NextResponse.json({ series, goal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


