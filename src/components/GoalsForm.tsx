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
  const [bioEditing, setBioEditing] = useState(false);
  const [heightInput, setHeightInput] = useState<HeightInput>({ feet: 0, inches: 0 });
  const [goalSettings, setGoalSettings] = useState<GoalSettings>({});

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
    
    // Convert height to feet/inches for display
    if (data.bio?.height) {
      setHeightInput(totalInchesToFeetInches(data.bio.height));
    }
    
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
      setBioEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveBio() {
    setSaving(true);
    try {
      // Calculate goals based on current bio data and selected macro split
      const selectedSplit = goal.macroSplit || 'balanced';
      const calculatedGoals = calculateGoalsFromBio(bio, selectedSplit, goalSettings);
      
      console.log('Saving bio:', bio);
      console.log('Calculated goals:', calculatedGoals);
      
      // Save both bio and calculated goals
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: calculatedGoals, bio, goalSettings }),
      });
      
      const result = await response.json();
      console.log('Save response:', result);
      
      try { window.dispatchEvent(new CustomEvent("nutrition:update")); } catch {}
      setBioEditing(false);
    } finally {
      setSaving(false);
    }
  }



  function onBioChange(key: keyof Bio, val: string) {
    if (key === 'biologicalSex' || key === 'activityLevel') {
      setBio((b) => ({ ...b, [key]: val === "" ? null : val }));
    } else {
      const parsed = val === "" ? null : Number(val);
      setBio((b) => ({ ...b, [key]: Number.isFinite(parsed as number) ? parsed : null }));
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

  function feetInchesToTotalInches(feet: number, inches: number): number {
    return feet * 12 + inches;
  }

  function totalInchesToFeetInches(totalInches: number): HeightInput {
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return { feet, inches };
  }

  function onHeightChange(type: 'feet' | 'inches', value: string) {
    const numValue = value === "" ? 0 : Number(value);
    setHeightInput(prev => {
      const newHeight = { ...prev, [type]: numValue };
      // Convert to total inches and update bio
      const totalInches = feetInchesToTotalInches(newHeight.feet, newHeight.inches);
      setBio(prevBio => ({ ...prevBio, height: totalInches }));
      return newHeight;
    });
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
    <div className="w-full max-w-2xl border rounded-lg p-4 flex flex-col gap-6">
      <div>
        <div className="flex justify-between items-center mb-3">
          <div className="text-lg font-semibold">Bio</div>
          <div className="flex gap-2">
            {bioEditing ? (
              <>
                <button 
                  onClick={saveBio} 
                  disabled={saving} 
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Save Bio
                </button>
                <button 
                  onClick={() => setBioEditing(false)} 
                  disabled={saving} 
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button 
                onClick={() => setBioEditing(true)} 
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Edit Bio
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm flex flex-col gap-1">
            <span>Age</span>
            <input 
              type="number" 
              value={bio.age ?? ""} 
              onChange={(e) => onBioChange("age", e.target.value)} 
              disabled={!bioEditing}
              className={`border rounded-lg px-3 py-2 ${bioEditing ? 'bg-transparent' : 'bg-gray-100 dark:bg-gray-800'}`} 
            />
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span>Biological Sex</span>
            <select 
              value={bio.biologicalSex ?? ""} 
              onChange={(e) => onBioChange("biologicalSex", e.target.value)} 
              disabled={!bioEditing}
              className={`border rounded-lg px-3 py-2 ${bioEditing ? 'bg-transparent' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1 col-span-2">
            <span>Height</span>
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="5"
                value={heightInput.feet || ""} 
                onChange={(e) => onHeightChange("feet", e.target.value)} 
                disabled={!bioEditing}
                className={`border rounded-lg px-3 py-2 flex-1 ${bioEditing ? 'bg-transparent' : 'bg-gray-100 dark:bg-gray-800'}`} 
              />
              <span className="flex items-center text-gray-500">ft</span>
              <input 
                type="number" 
                placeholder="8"
                value={heightInput.inches || ""} 
                onChange={(e) => onHeightChange("inches", e.target.value)} 
                disabled={!bioEditing}
                className={`border rounded-lg px-3 py-2 flex-1 ${bioEditing ? 'bg-transparent' : 'bg-gray-100 dark:bg-gray-800'}`} 
              />
              <span className="flex items-center text-gray-500">in</span>
            </div>
          </label>
          <label className="text-sm flex flex-col gap-1 col-span-2">
            <span>Weight (lbs)</span>
            <input 
              type="number" 
              value={bio.weight ?? ""} 
              onChange={(e) => onBioChange("weight", e.target.value)} 
              disabled={!bioEditing}
              className={`border rounded-lg px-3 py-2 ${bioEditing ? 'bg-transparent' : 'bg-gray-100 dark:bg-gray-800'}`} 
            />
          </label>
          <label className="text-sm flex flex-col gap-1 col-span-2">
            <span>Activity Level</span>
            <select 
              value={bio.activityLevel ?? ""} 
              onChange={(e) => onBioChange("activityLevel", e.target.value)} 
              disabled={!bioEditing}
              className={`border rounded-lg px-3 py-2 ${bioEditing ? 'bg-transparent' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              <option value="">Select...</option>
              <option value="sedentary">Sedentary</option>
              <option value="lightly active">Lightly Active</option>
              <option value="moderately active">Moderately Active</option>
              <option value="very active">Very Active</option>
              <option value="extra active">Extra Active</option>
            </select>
          </label>
        </div>
      </div>
      
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
      
      <div>
        <div className="text-lg font-semibold mb-3">Macro Split</div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(macroSplits).map(([key, split]) => (
              <label key={key} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
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
        <button onClick={save} disabled={saving} className="border rounded-lg px-3 py-2 bg-foreground text-background disabled:opacity-50">Save All</button>
      </div>
    </div>
  );
}


