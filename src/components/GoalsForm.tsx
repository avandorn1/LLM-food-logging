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

type Bio = {
  age?: number | null;
  biologicalSex?: string | null;
  height?: number | null;
  weight?: number | null;
  activityLevel?: string | null;
};

type GoalSettings = {
  goalType?: string | null;
  pace?: string | null;
};

type HeightInput = {
  feet: number;
  inches: number;
};

export default function GoalsForm() {
  const [goal, setGoal] = useState<Goal>({});
  const [bio, setBio] = useState<Bio>({});
  const [saving, setSaving] = useState(false);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>({});
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

  const goalTypes = {
    'lose': { name: 'Lose Weight', description: 'Create a calorie deficit' },
    'maintain': { name: 'Maintain Weight', description: 'Keep current weight' },
    'gain': { name: 'Gain Weight', description: 'Create a calorie surplus' }
  };

  const paces = {
    'lose-slow': { name: 'Lose 0.5 lb/week', description: 'Slow & steady', adjustment: -250 },
    'lose-moderate': { name: 'Lose 1.0 lb/week', description: 'Moderate', adjustment: -500 },
    'lose-aggressive': { name: 'Lose 1.5 lb/week', description: 'Aggressive, short-term only', adjustment: -750 },
    'gain-slow': { name: 'Gain 0.25-0.5 lb/week', description: 'Muscle-friendly pace', adjustment: 375 }
  };

  async function load() {
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoal(data.goal || { macroSplit: 'balanced' });
    setBio(data.bio || {});
    setGoalSettings(data.goalSettings || { goalType: 'maintain', pace: 'lose-moderate' });
    
    // Calculate TDEE if we have bio data
    if (data.bio) {
      setTimeout(() => {
        const selectedSplit = data.goal?.macroSplit || 'balanced';
        calculateTDEEWithSplit(selectedSplit, data.goalSettings);
      }, 0);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (bio.age && bio.biologicalSex && bio.height && bio.weight && bio.activityLevel) {
      const selectedSplit = goal.macroSplit || 'balanced';
      calculateTDEEWithSplit(selectedSplit, goalSettings);
    }
  }, [bio, goalSettings]);

  async function save() {
    setSaving(true);
    try {
      // Calculate goals based on current bio data and selected macro split
      const selectedSplit = goal.macroSplit || 'balanced';
      const calculatedGoals = calculateGoalsFromBio(bio, selectedSplit, goalSettings);
      
      // Save both bio and calculated goals
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: calculatedGoals, bio, goalSettings }),
      });
      try { window.dispatchEvent(new CustomEvent("nutrition:update")); } catch {}
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }



  function onMacroSplitChange(splitKey: string) {
    setGoal((g) => ({ ...g, macroSplit: splitKey }));
    // Recalculate macros with new split
    setTimeout(() => calculateTDEEWithSplit(splitKey, goalSettings), 0);
  }

  function onGoalTypeChange(goalType: string) {
    const newGoalSettings = { ...goalSettings, goalType };
    setGoalSettings(newGoalSettings);
    // Recalculate goals with new goal type
    setTimeout(() => {
      const selectedSplit = goal.macroSplit || 'balanced';
      calculateTDEEWithSplit(selectedSplit, newGoalSettings);
    }, 0);
  }

  function onPaceChange(pace: string) {
    const newGoalSettings = { ...goalSettings, pace };
    setGoalSettings(newGoalSettings);
    // Recalculate goals with new pace
    setTimeout(() => {
      const selectedSplit = goal.macroSplit || 'balanced';
      calculateTDEEWithSplit(selectedSplit, newGoalSettings);
    }, 0);
  }



  function calculateGoalsFromBio(bioData: Bio, splitKey: string, currentGoalSettings?: GoalSettings) {
    const { age, biologicalSex, height, weight, activityLevel } = bioData;
    const settings = currentGoalSettings || goalSettings;
    
    console.log('Calculating goals from bio:', bioData);
    console.log('Split key:', splitKey);
    console.log('Goal settings:', settings);
    
    // Check if we have all required data
    if (!age || !biologicalSex || !height || !weight || !activityLevel) {
      console.log('Missing required bio data:', { age, biologicalSex, height, weight, activityLevel });
      return {};
    }

    // Calculate BMR based on biological sex
    let bmr: number;
    if (biologicalSex === 'male') {
      bmr = 66 + (6.23 * weight) + (12.7 * height) - (6.8 * age);
    } else if (biologicalSex === 'female') {
      bmr = 655 + (4.35 * weight) + (4.7 * height) - (4.7 * age);
    } else {
      return {};
    }

    // Activity factors
    const activityFactors: Record<string, number> = {
      'sedentary': 1.2,
      'lightly active': 1.375,
      'moderately active': 1.55,
      'very active': 1.725,
      'extra active': 1.9
    };

    const activityFactor = activityFactors[activityLevel];
    if (!activityFactor) {
      return {};
    }

    // Calculate TDEE
    const tdee = Math.round(bmr * activityFactor);
    
    // Apply calorie adjustment based on goal type and pace
    let adjustedCalories = tdee;
    if (settings.goalType && settings.pace) {
      const pace = paces[settings.pace as keyof typeof paces];
      if (pace) {
        adjustedCalories = Math.round(tdee + pace.adjustment);
        console.log(`TDEE: ${tdee}, Adjustment: ${pace.adjustment}, Final: ${adjustedCalories}`);
      }
    }
    
    // Calculate macros based on provided split
    const split = macroSplits[splitKey];
    
    if (split) {
      const proteinGrams = Math.round((adjustedCalories * split.protein / 100) / 4); // 4 cal per gram
      const fatGrams = Math.round((adjustedCalories * split.fat / 100) / 9); // 9 cal per gram
      const carbsGrams = Math.round((adjustedCalories * split.carbs / 100) / 4); // 4 cal per gram
      
      return {
        targetCalories: adjustedCalories,
        targetProtein: proteinGrams,
        targetCarbs: carbsGrams,
        targetFat: fatGrams,
        macroSplit: splitKey
      };
    } else {
      return { targetCalories: adjustedCalories };
    }
  }

  function calculateTDEE() {
    const selectedSplit = goal.macroSplit || 'balanced';
    calculateTDEEWithSplit(selectedSplit);
  }

  function calculateTDEEWithSplit(splitKey: string, currentGoalSettings?: GoalSettings) {
    const calculatedGoals = calculateGoalsFromBio(bio, splitKey, currentGoalSettings);
    setGoal(prev => ({ ...prev, ...calculatedGoals }));
  }

  return (
    <div className="w-full max-w-2xl border rounded-lg p-4 flex flex-col gap-6 relative">
      <div>
        <div className="text-lg font-semibold mb-3">Goal Type</div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(goalTypes).map(([key, goalType]) => (
              <label key={key} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="goalType"
                  value={key}
                  checked={goalSettings.goalType === key}
                  onChange={() => onGoalTypeChange(key)}
                  className="text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium">{goalType.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{goalType.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      {goalSettings.goalType && goalSettings.goalType !== 'maintain' && (
        <div>
          <div className="text-lg font-semibold mb-3">Pace</div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(paces)
                .filter(([key]) => {
                  if (goalSettings.goalType === 'lose') {
                    return key.startsWith('lose-');
                  } else if (goalSettings.goalType === 'gain') {
                    return key.startsWith('gain-');
                  }
                  return false;
                })
                .map(([key, pace]) => (
                  <label key={key} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="radio"
                      name="pace"
                      value={key}
                      checked={goalSettings.pace === key}
                      onChange={() => onPaceChange(key)}
                      className="text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{pace.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{pace.description}</div>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        </div>
      )}
      
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


