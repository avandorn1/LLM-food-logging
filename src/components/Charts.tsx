"use client";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from "recharts";

type SeriesPoint = { day: string; calories: number; protein: number; carbs: number; fat: number };
type Goal = { targetCalories?: number | null; targetProtein?: number | null; targetCarbs?: number | null; targetFat?: number | null } | null;

export default function Charts() {
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [goal, setGoal] = useState<Goal>(null);

  async function load() {
    const res = await fetch("/api/summary?days=2", { cache: "no-store" });
    const data = await res.json();
    setSeries(data.series || []);
    setGoal(data.goal || null);
  }

  useEffect(() => {
    load();
    function onUpdate() { load(); }
    window.addEventListener("nutrition:update", onUpdate);
    return () => window.removeEventListener("nutrition:update", onUpdate);
  }, []);

  // Use Eastern Time for date calculations
  const now = new Date();
  const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
  const todayKey = easternDate.toISOString().slice(0, 10);
  const today = series.find((p) => p.day === todayKey) ?? series[series.length - 1];
  function buildPie(consumed: number, goalValue: number | null | undefined, unit: string) {
    const safeConsumed = Math.max(0, Math.round(consumed));
    const safeGoal = goalValue != null ? Math.max(0, Math.round(goalValue)) : null;
    if (safeGoal == null) {
      return [
        { name: "Consumed", value: safeConsumed, color: "#3b82f6", label: `Consumed ${safeConsumed}${unit}` },
      ];
    }
    const consumedInGoal = Math.min(safeConsumed, safeGoal);
    const remaining = Math.max(safeGoal - safeConsumed, 0);
    const over = Math.max(safeConsumed - safeGoal, 0);
    const data = [] as Array<{ name: string; value: number; color: string; label: string }>;
    if (consumedInGoal > 0) data.push({ name: "Consumed", value: consumedInGoal, color: "#3b82f6", label: `Consumed ${consumedInGoal}${unit}` });
    if (remaining > 0) data.push({ name: "Remaining", value: remaining, color: "#e5e7eb", label: `Remaining ${remaining}${unit}` });
    if (over > 0) data.push({ name: "Over", value: over, color: "#ef4444", label: `Over ${over}${unit}` });
    if (data.length === 0) data.push({ name: "Remaining", value: 0, color: "#e5e7eb", label: `Remaining 0${unit}` });
    return data;
  }

  function renderLabel(unit: string) {
    return (props: any) => {
      const RADIAN = Math.PI / 180;
      const {
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        value,
        name,
        percent,
      } = props;
      const radius = outerRadius + 12;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      if (percent < 0.06) return null;
      return (
        <text x={x} y={y} fill="#111827" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" style={{ fontSize: 11 }}>
          {`${value}${unit}`}
        </text>
      );
    };
  }

  return (
    <div className="w-full border rounded-lg p-4">
      <div className="text-lg font-semibold mb-4">Intake vs Goals</div>
      {today ? (
        <>
          <div className="h-[28rem] w-full border rounded-lg px-10 py-5 pb-10 overflow-visible">
            <div className="text-sm font-medium mb-2">Calories {goal?.targetCalories ? `(goal ${goal.targetCalories})` : ""}</div>
            <ResponsiveContainer>
              <PieChart margin={{ top: 28, left: 64, right: 64, bottom: 24 }}>
                <Pie data={buildPie(today.calories, goal?.targetCalories, "kcal")} dataKey="value" nameKey="name" innerRadius={39} outerRadius={55} paddingAngle={2} minAngle={8} isAnimationActive={false} labelLine label={renderLabel("kcal")}>
                  {buildPie(today.calories, goal?.targetCalories, "kcal").map((s, i) => (
                    <Cell key={`cal-${i}`} fill={s.color} />
                  ))}
                  <Label value={`${today.calories} kcal`} position="center" fill="#111827" style={{ fontSize: 14, fontWeight: 600 }} />
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            <div className="h-96 w-full border rounded-lg px-10 py-6 pb-12 overflow-visible">
              <div className="text-sm font-medium mb-2">Protein (g) {goal?.targetProtein ? `(goal ${goal.targetProtein})` : ""}</div>
              <ResponsiveContainer>
                <PieChart margin={{ top: 24, left: 64, right: 64, bottom: 24 }}>
                  <Pie data={buildPie(today.protein, goal?.targetProtein, "g")} dataKey="value" nameKey="name" innerRadius={34} outerRadius={50} paddingAngle={2} minAngle={8} isAnimationActive={false} labelLine label={renderLabel("g")}>
                    {buildPie(today.protein, goal?.targetProtein, "g").map((s, i) => (
                      <Cell key={`pro-${i}`} fill={s.color} />
                    ))}
                    <Label value={`${today.protein} g`} position="center" fill="#111827" style={{ fontSize: 14, fontWeight: 600 }} />
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-96 w-full border rounded-lg px-10 py-6 pb-12 overflow-visible">
              <div className="text-sm font-medium mb-2">Carbs (g) {goal?.targetCarbs ? `(goal ${goal.targetCarbs})` : ""}</div>
              <ResponsiveContainer>
                <PieChart margin={{ top: 24, left: 64, right: 64, bottom: 24 }}>
                  <Pie data={buildPie(today.carbs, goal?.targetCarbs, "g")} dataKey="value" nameKey="name" innerRadius={34} outerRadius={50} paddingAngle={2} minAngle={8} isAnimationActive={false} labelLine label={renderLabel("g")}>
                    {buildPie(today.carbs, goal?.targetCarbs, "g").map((s, i) => (
                      <Cell key={`carb-${i}`} fill={s.color} />
                    ))}
                    <Label value={`${today.carbs} g`} position="center" fill="#111827" style={{ fontSize: 14, fontWeight: 600 }} />
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-96 w-full border rounded-lg px-10 py-6 pb-12 overflow-visible">
              <div className="text-sm font-medium mb-2">Fat (g) {goal?.targetFat ? `(goal ${goal.targetFat})` : ""}</div>
              <ResponsiveContainer>
                <PieChart margin={{ top: 24, left: 64, right: 64, bottom: 24 }}>
                  <Pie data={buildPie(today.fat, goal?.targetFat, "g")} dataKey="value" nameKey="name" innerRadius={34} outerRadius={50} paddingAngle={2} minAngle={8} isAnimationActive={false} labelLine label={renderLabel("g")}>
                    {buildPie(today.fat, goal?.targetFat, "g").map((s, i) => (
                      <Cell key={`fat-${i}`} fill={s.color} />
                    ))}
                    <Label value={`${today.fat} g`} position="center" fill="#111827" style={{ fontSize: 14, fontWeight: 600 }} />
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="h-24 flex items-center justify-center text-sm text-gray-500">No data yet</div>
      )}
      <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 flex gap-4 flex-wrap">
        {(() => {
          // Use Eastern Time for date calculations
          const now = new Date();
          const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
          const todayKey = easternDate.toISOString().slice(0, 10);
          const today = series.find((p) => p.day === todayKey) ?? series[series.length - 1];
          if (!today) return null;
          return (
            <>
              <span>Today: {today.day}</span>
              <span>Calories: {today.calories}{goal?.targetCalories ? ` / ${goal.targetCalories}` : ""}</span>
              <span>Protein: {today.protein}{goal?.targetProtein ? ` / ${goal.targetProtein}g` : "g"}</span>
              <span>Carbs: {today.carbs}{goal?.targetCarbs ? ` / ${goal.targetCarbs}g` : "g"}</span>
              <span>Fat: {today.fat}{goal?.targetFat ? ` / ${goal.targetFat}g` : "g"}</span>
            </>
          );
        })()}
      </div>
    </div>
  );
}


