"use client";
import { useEffect, useState } from "react";

type Bio = {
  age?: number | null;
  biologicalSex?: string | null;
  height?: number | null;
  weight?: number | null;
  activityLevel?: string | null;
};

type HeightInput = {
  feet: number;
  inches: number;
};

export default function Bio() {
  const [bio, setBio] = useState<Bio>({});
  const [saving, setSaving] = useState(false);
  const [bioEditing, setBioEditing] = useState(false);
  const [heightInput, setHeightInput] = useState<HeightInput>({ feet: 0, inches: 0 });

  async function load() {
    const res = await fetch("/api/goals");
    const data = await res.json();
    setBio(data.bio || {});
    
    // Convert height to feet/inches for display
    if (data.bio?.height) {
      setHeightInput(totalInchesToFeetInches(data.bio.height));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveBio() {
    setSaving(true);
    try {
      console.log('Saving bio:', bio);
      
      // Save bio data
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
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
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
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
    </div>
  );
}
