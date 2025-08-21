"use client";
import { useEffect, useState } from "react";

type Goal = {
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  macroSplit?: string | null;
};

type Bio = {
  age?: number | null;
  biologicalSex?: string | null;
  height?: number | null;
  weight?: number | null;
  activityLevel?: string | null;
};

export default function Goals() {
  const [goal, setGoal] = useState<Goal>({});
  const [bio, setBio] = useState<Bio>({});

  const macroSplits: Record<string, { name: string; protein: number; carbs: number; fat: number }> = {
    'balanced': { name: 'Balanced', protein: 25, carbs: 50, fat: 25 },
    'high-protein': { name: 'High Protein', protein: 35, carbs: 40, fat: 25 },
    'low-carb': { name: 'Low Carb', protein: 30, carbs: 25, fat: 45 },
    'athlete': { name: 'Athlete', protein: 30, carbs: 55, fat: 15 },
    'keto': { name: 'Keto', protein: 25, carbs: 10, fat: 65 }
  };

  async function load() {
    const res = await fetch("/api/goals");
    const data = await res.json();
    console.log('Goals component loaded data:', data);
    setGoal(data.goal || {});
    setBio(data.bio || {});
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handleUpdate = () => load();
    window.addEventListener("nutrition:update", handleUpdate);
    return () => window.removeEventListener("nutrition:update", handleUpdate);
  }, []);

  return (
    <div className="w-full max-w-2xl border rounded-lg p-3 flex flex-col gap-2">
      <div className="text-lg font-semibold">Calculated Goals</div>
      <div className="grid grid-cols-1 gap-3">
        <div className="text-sm flex flex-col gap-1">
          <span className="text-gray-600 dark:text-gray-400">Calories</span>
          <div className="border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {goal.targetCalories ? `${goal.targetCalories} kcal` : '—'}
          </div>
        </div>
        <div className="text-sm flex flex-col gap-1">
          <span className="text-gray-600 dark:text-gray-400">
            Protein (g)
            {goal.macroSplit && macroSplits[goal.macroSplit] && (
              <span className="text-xs text-gray-400 ml-1">
                {macroSplits[goal.macroSplit].protein}%
              </span>
            )}
          </span>
          <div className="border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {goal.targetProtein ? `${goal.targetProtein}g` : '—'}
          </div>
        </div>
        <div className="text-sm flex flex-col gap-1">
          <span className="text-gray-600 dark:text-gray-400">
            Carbs (g)
            {goal.macroSplit && macroSplits[goal.macroSplit] && (
              <span className="text-xs text-gray-400 ml-1">
                {macroSplits[goal.macroSplit].carbs}%
              </span>
            )}
          </span>
          <div className="border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {goal.targetCarbs ? `${goal.targetCarbs}g` : '—'}
          </div>
        </div>
        <div className="text-sm flex flex-col gap-1">
          <span className="text-gray-600 dark:text-gray-400">
            Fat (g)
            {goal.macroSplit && macroSplits[goal.macroSplit] && (
              <span className="text-xs text-gray-400 ml-1">
                {macroSplits[goal.macroSplit].fat}%
              </span>
            )}
          </span>
          <div className="border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {goal.targetFat ? `${goal.targetFat}g` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
