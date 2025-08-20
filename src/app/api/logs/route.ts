import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay, addDays } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId") || 1);
    const dayParam = searchParams.get("day");
    // Use Eastern Time for date calculations
  const now = new Date();
  const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
  const base = dayParam ? new Date(`${dayParam}T00:00:00`) : easternDate;
    const start = startOfDay(base);
    const end = addDays(start, 1);

    const logs = await prisma.foodLog.findMany({
      where: {
        userId,
        OR: [
          { day: { gte: start, lt: end } },
          { loggedAt: { gte: start, lt: end } },
        ],
      },
      orderBy: { loggedAt: "asc" },
      select: {
        id: true,
        loggedAt: true,
        mealType: true,
        item: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
      },
    });

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logs, userId = 1, day } = body;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ error: "No logs provided" }, { status: 400 });
    }

    // Use Eastern Time for date calculations
    const now = new Date();
    const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
    const dayDate = startOfDay(day ? new Date(day) : easternDate);

    // Ensure user exists
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });

    // Log all items
    const createdLogs = await prisma.$transaction(
      logs.map((log) =>
        prisma.foodLog.create({
          data: {
            userId: user.id,
            day: dayDate,
            item: log.item,
            mealType: log.mealType,
            quantity: log.quantity,
            unit: log.unit,
            calories: log.calories ? Math.round(log.calories) : null,
            protein: log.protein ?? null,
            carbs: log.carbs ?? null,
            fat: log.fat ?? null,
            fiber: log.fiber ?? null,
            sugar: log.sugar ?? null,
            sodium: log.sodium ?? null,
            notes: log.notes ?? null,
          },
        })
      )
    );

    return NextResponse.json({ 
      success: true, 
      message: `Successfully logged ${logs.length} item(s)`,
      logs: createdLogs 
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await prisma.foodLog.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


