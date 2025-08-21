"use client";
import { useEffect, useState } from "react";

type Goal = {
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  macroSplit?: string | null;
};

type MacroSplit = {
  name: string;
  protein: number; // percentage
  carbs: number;   // percentage
  fat: number;     // percentage
  description: string;
};

export default function MacroSplit() {
  const [goal, setGoal] = useState<Goal>({});
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const macroSplits: Record<string, MacroSplit> = {
    'balanced': {
      name: 'Balanced',
      protein: 25,
      carbs: 50,
      fat: 25,
      description: 'Standard balanced approach'
    },
    'high-protein': {
      name: 'High Protein',
      protein: 35,
      carbs: 40,
      fat: 25,
      description: 'Higher protein for muscle building/recovery'
    },
    'low-carb': {
      name: 'Low Carb',
      protein: 30,
      carbs: 25,
      fat: 45,
      description: 'Reduced carbs, higher fat'
    },
    'athlete': {
      name: 'Athlete',
      protein: 30,
      carbs: 55,
      fat: 15,
      description: 'Higher carbs for performance'
    },
    'keto': {
      name: 'Keto',
      protein: 25,
      carbs: 10,
      fat: 65,
      description: 'Very low carb, high fat'
    }
  };

  async function load() {
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoal(data.goal || { macroSplit: 'balanced' });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handleUpdate = () => load();
    window.addEventListener("nutrition:update", handleUpdate);
    return () => window.removeEventListener("nutrition:update", handleUpdate);
  }, []);

  async function save() {
    setSaving(true);
    try {
      // Get current goal data to preserve existing values
      const currentRes = await fetch("/api/goals");
      const currentData = await currentRes.json();
      const currentGoal = currentData.goal || {};
      
      // Merge current goal with new macroSplit
      const updatedGoal = { ...currentGoal, macroSplit: goal.macroSplit };
      
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: updatedGoal }),
      });
      try { window.dispatchEvent(new CustomEvent("nutrition:update")); } catch {}
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function onMacroSplitChange(splitKey: string) {
    console.log('Changing macro split to:', splitKey);
    const updatedGoal = { ...goal, macroSplit: splitKey };
    console.log('Updated goal:', updatedGoal);
    setGoal(updatedGoal);
  }

  return (
    <div className="w-full max-w-2xl border rounded-lg p-4 flex flex-col gap-6 relative">
      <div>
        <div className="text-lg font-semibold mb-3">Macro Split</div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(macroSplits).map(([key, split]) => (
              <label key={`${key}-${goal.macroSplit}`} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="macroSplit"
                  value={key}
                  checked={goal.macroSplit === key}
                  onChange={() => onMacroSplitChange(key)}
                  className="text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium">{split.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{split.description}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {split.protein}% Protein • {split.carbs}% Carbs • {split.fat}% Fat
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="border rounded-lg px-3 py-2 bg-foreground text-background disabled:opacity-50">Save</button>
      </div>
      
      {showSaved && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </div>
      )}
    </div>
  );
}
