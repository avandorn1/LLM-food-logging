"use client";
import { useEffect, useState } from "react";

type Goal = {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
} | null;

type Row = {
  id: number;
  item: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
};

export default function CalorieGauge() {
  const [goal, setGoal] = useState<Goal>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
              // Use Eastern Time for date calculations
        const now = new Date();
        const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
        const [goalRes, logsRes] = await Promise.all([
          fetch("/api/goals"),
          fetch(`/api/logs?day=${easternDate.toISOString().split('T')[0]}`),
        ]);
      const goalData = await goalRes.json();
      const logsData = await logsRes.json();
      setGoal(goalData);
      setRows(logsData.logs || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handleUpdate = () => load();
    window.addEventListener("nutrition:update", handleUpdate);
    return () => window.removeEventListener("nutrition:update", handleUpdate);
  }, []);


  
  if (loading) {
    return (
      <div className="w-full border rounded-lg p-4">
        <div className="text-lg font-semibold mb-3">Progress Towards Calorie Goals</div>
        <div className="w-full h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  // Extract the actual goal data from the nested structure
  const actualGoal = goal?.goal || goal;
  
  console.log("CalorieGauge - goal:", goal, "actualGoal:", actualGoal);
  
  if (!actualGoal?.targetCalories) {
    return (
      <div className="w-full border rounded-lg p-4">
        <div className="text-lg font-semibold mb-3">Progress Towards Calorie Goals</div>
        <div className="text-sm text-gray-500 text-center py-4">
          Set your calorie goals to see progress
        </div>
      </div>
    );
  }

  // Ensure rows is an array and calculate total calories
  const rowsArray = Array.isArray(rows) ? rows : [];
  const totalCalories = rowsArray.reduce((sum, row) => sum + (row.calories || 0), 0);
  const percentage = (totalCalories / actualGoal.targetCalories) * 100;

  // Debug logging
  console.log('CalorieGauge debug:', {
    totalCalories,
    targetCalories: actualGoal.targetCalories,
    percentage,
    rowsArray: rowsArray.length
  });

  // Define the sweet spot range (±30% of target)
  const sweetSpotStart = 70; // 70% of target
  const sweetSpotEnd = 130;  // 130% of target

  // Calculate gauge position - map percentage to visual position
  let gaugePosition;
  let section = "under";

  if (percentage > sweetSpotEnd) {
    // Over 130% - map to 60-100% of visual gauge
    gaugePosition = 60 + Math.min((percentage - sweetSpotEnd) / 70 * 40, 40);
    section = "over";
  } else if (percentage >= sweetSpotStart) {
    // Sweet spot 70-130% - map to 40-60% of visual gauge
    gaugePosition = 40 + ((percentage - sweetSpotStart) / (sweetSpotEnd - sweetSpotStart)) * 20;
    section = "sweet spot";
  } else {
    // Under 70% - map to 0-40% of visual gauge
    gaugePosition = (percentage / sweetSpotStart) * 40;
  }

  // Ensure gauge position is at least 0 for visual purposes
  gaugePosition = Math.max(0, Math.min(100, gaugePosition));

  return (
    <div className="w-full border rounded-lg p-4">
      <div className="text-lg font-semibold mb-3">Progress Towards Calorie Goals</div>
      
      {/* Gauge Container */}
      <div className="relative w-full h-40 flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg className="w-48 h-48" viewBox="0 0 100 100">
            {/* Main gauge arc with gradient */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="40%" stopColor="#ef4444" />
                <stop offset="40%" stopColor="#22c55e" />
                <stop offset="60%" stopColor="#22c55e" />
                <stop offset="60%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>
            
            {/* Background arc */}
            <path
              d="M 15 50 a 35 35 0 0 1 70 0"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            
            {/* Colored gauge arc */}
            <path
              d="M 15 50 a 35 35 0 0 1 70 0"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            
            {/* Gauge needle */}
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="15"
              stroke="#1f2937"
              strokeWidth="4"
              strokeLinecap="round"
              transform={`rotate(${(gaugePosition / 100) * 180 - 90} 50 50)`}
              style={{ transition: 'transform 0.5s ease-out' }}
            />
            

            
            {/* Center dot */}
            <circle cx="50" cy="50" r="4" fill="#1f2937" />
            
            {/* Zone labels on the gauge */}
            <text x="20" y="65" textAnchor="middle" fontSize="8" fill="#6b7280" fontWeight="500">
              Under
            </text>
            <text x="50" y="8" textAnchor="middle" fontSize="8" fill="#6b7280" fontWeight="500">
              Sweet Spot
            </text>
            <text x="80" y="65" textAnchor="middle" fontSize="8" fill="#6b7280" fontWeight="500">
              Over
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
