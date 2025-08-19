"use client";
import { useEffect, useState } from "react";

type Row = {
  id: number;
  loggedAt: string;
  mealType: string | null;
  item: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type Goal = {
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
} | null;

export default function FoodLogTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState<Goal>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // Use Eastern Time for date calculations
  const now = new Date();
  const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
  const today = easternDate.toISOString().slice(0, 10);
      const [logsRes, goalsRes] = await Promise.all([
        fetch(`/api/logs?day=${today}`, { cache: "no-store" }),
        fetch(`/api/goals`, { cache: "no-store" }),
      ]);
      const [logsData, goalsData] = await Promise.all([
        logsRes.json(),
        goalsRes.json(),
      ]);
      setRows(logsData.logs || []);
      setGoal((goalsData && goalsData.goal) || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    function onUpdate() { load(); }
    window.addEventListener("nutrition:update", onUpdate);
    return () => window.removeEventListener("nutrition:update", onUpdate);
  }, []);

  function formatValue(value: number | null | undefined, unit: string): string {
    if (value == null) return "";
    return `${value} ${unit}`;
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.calories += r.calories ?? 0;
      acc.protein += r.protein ?? 0;
      acc.carbs += r.carbs ?? 0;
      acc.fat += r.fat ?? 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remaining = goal
    ? {
        calories: Math.max((goal.targetCalories ?? 0) - totals.calories, 0),
        protein: Math.max((goal.targetProtein ?? 0) - totals.protein, 0),
        carbs: Math.max((goal.targetCarbs ?? 0) - totals.carbs, 0),
        fat: Math.max((goal.targetFat ?? 0) - totals.fat, 0),
      }
    : null;

  async function requestDelete(id: number) {
    setConfirmId(id);
  }

  async function confirmDelete(yes: boolean) {
    const id = confirmId;
    setConfirmId(null);
    if (!yes || !id) return;
    try {
      await fetch("/api/logs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      window.dispatchEvent(new CustomEvent("nutrition:update"));
      await load();
    } catch {}
  }

  return (
    <div className="w-full max-w-5xl border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">Food log (today)</div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
        >
          {isCollapsed ? "▼" : "▲"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className={isCollapsed ? "hidden" : ""}>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 pr-3 text-right">Calories</th>
              <th className="py-2 pr-3 text-right">Protein</th>
              <th className="py-2 pr-3 text-right">Carbs</th>
              <th className="py-2 pr-3 text-right">Fat</th>
              <th className="py-2 pr-0 w-8"></th>
            </tr>
          </thead>
          <tbody className={isCollapsed ? "hidden" : ""}>
            {rows.length === 0 && !loading ? (
              <tr>
                <td className="py-3 text-gray-500" colSpan={5}>No items logged yet.</td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="py-2 pr-3">{r.item}</td>
                <td className="py-2 pr-3 text-right">{formatValue(r.calories, "kcal")}</td>
                <td className="py-2 pr-3 text-right">{formatValue(r.protein as number, "g")}</td>
                <td className="py-2 pr-3 text-right">{formatValue(r.carbs as number, "g")}</td>
                <td className="py-2 pr-3 text-right">{formatValue(r.fat as number, "g")}</td>
                <td className="py-2 pr-0 text-right">
                  <button aria-label="Delete" onClick={() => requestDelete(r.id)} className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-red-100 text-red-600">×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-medium">
              <td className="py-2 pr-3" colSpan={1}>Totals</td>
              <td className="py-2 pr-3 text-right">{formatValue(totals.calories, "kcal")}</td>
              <td className="py-2 pr-3 text-right">{formatValue(totals.protein, "g")}</td>
              <td className="py-2 pr-3 text-right">{formatValue(totals.carbs, "g")}</td>
              <td className="py-2 pr-3 text-right">{formatValue(totals.fat, "g")}</td>
              <td></td>
            </tr>
            <tr className="border-t">
              <td className="py-2 pr-3" colSpan={1}>Daily goal</td>
              <td className="py-2 pr-3 text-right">{formatValue(goal?.targetCalories ?? null, "kcal")}</td>
              <td className="py-2 pr-3 text-right">{formatValue(goal?.targetProtein ?? null, "g")}</td>
              <td className="py-2 pr-3 text-right">{formatValue(goal?.targetCarbs ?? null, "g")}</td>
              <td className="py-2 pr-3 text-right">{formatValue(goal?.targetFat ?? null, "g")}</td>
              <td></td>
            </tr>
            <tr className="border-t">
              <td className="py-2 pr-3 bg-blue-100 text-black" colSpan={1}>Total remaining</td>
              <td className="py-2 pr-3 text-right bg-blue-100 text-black">{remaining ? formatValue(remaining.calories, "kcal") : ""}</td>
              <td className="py-2 pr-3 text-right bg-blue-100 text-black">{remaining ? formatValue(remaining.protein, "g") : ""}</td>
              <td className="py-2 pr-3 text-right bg-blue-100 text-black">{remaining ? formatValue(remaining.carbs, "g") : ""}</td>
              <td className="py-2 pr-3 text-right bg-blue-100 text-black">{remaining ? formatValue(remaining.fat, "g") : ""}</td>
              <td className="bg-blue-100"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {confirmId != null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 w-full max-w-sm shadow-lg border">
            <div className="text-base font-semibold mb-2">Remove item?</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">Are you sure you want to delete this log entry?</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => confirmDelete(false)} className="px-3 py-2 rounded border">No</button>
              <button onClick={() => confirmDelete(true)} className="px-3 py-2 rounded bg-red-600 text-white">Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


