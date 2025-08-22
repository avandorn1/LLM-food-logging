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

export default function MacroGauges() {
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
        <div className="text-lg font-semibold mb-3">Progress Towards Macro Goals</div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Extract the actual goal data from the nested structure
  const actualGoal = goal;
  
  if (!actualGoal?.targetProtein || !actualGoal?.targetCarbs || !actualGoal?.targetFat) {
    return (
      <div className="w-full border rounded-lg p-4">
        <div className="text-lg font-semibold mb-3">Progress Towards Macro Goals</div>
        <div className="text-sm text-gray-500 text-center py-4">
          Set your macro goals to see progress
        </div>
      </div>
    );
  }

  // Ensure rows is an array and calculate totals
  const rowsArray = Array.isArray(rows) ? rows : [];
  const totalProtein = rowsArray.reduce((sum, row) => sum + (row.protein || 0), 0);
  const totalCarbs = rowsArray.reduce((sum, row) => sum + (row.carbs || 0), 0);
  const totalFat = rowsArray.reduce((sum, row) => sum + (row.fat || 0), 0);

  const proteinPercentage = (totalProtein / actualGoal.targetProtein) * 100;
  const carbsPercentage = (totalCarbs / actualGoal.targetCarbs) * 100;
  const fatPercentage = (totalFat / actualGoal.targetFat) * 100;

  // Define the sweet spot range (±30% of target)
  const sweetSpotStart = 70; // 70% of target
  const sweetSpotEnd = 130;  // 130% of target

  const calculateGaugePosition = (percentage: number) => {
    if (percentage > sweetSpotEnd) {
      // Over 130% - map to 60-100% of visual gauge
      return 60 + Math.min((percentage - sweetSpotEnd) / 70 * 40, 40);
    } else if (percentage >= sweetSpotStart) {
      // Sweet spot 70-130% - map to 40-60% of visual gauge
      return 40 + ((percentage - sweetSpotStart) / (sweetSpotEnd - sweetSpotStart)) * 20;
    } else {
      // Under 70% - map to 0-40% of visual gauge
      return (percentage / sweetSpotStart) * 40;
    }
  };

  const proteinPosition = Math.max(0, Math.min(100, calculateGaugePosition(proteinPercentage)));
  const carbsPosition = Math.max(0, Math.min(100, calculateGaugePosition(carbsPercentage)));
  const fatPosition = Math.max(0, Math.min(100, calculateGaugePosition(fatPercentage)));

  const macroData = [
    {
      name: "Protein",
      current: totalProtein,
      target: actualGoal.targetProtein,
      percentage: proteinPercentage,
      position: proteinPosition,
      color: "#3b82f6",
      gradientId: "proteinGradient"
    },
    {
      name: "Carbs",
      current: totalCarbs,
      target: actualGoal.targetCarbs,
      percentage: carbsPercentage,
      position: carbsPosition,
      color: "#10b981",
      gradientId: "carbsGradient"
    },
    {
      name: "Fat",
      current: totalFat,
      target: actualGoal.targetFat,
      percentage: fatPercentage,
      position: fatPosition,
      color: "#f59e0b",
      gradientId: "fatGradient"
    }
  ];

  return (
    <div className="w-full border rounded-lg p-4">
      <div className="text-lg font-semibold mb-3">Progress Towards Macro Goals</div>
      
      <div className="grid grid-cols-3 gap-4">
        {macroData.map((macro) => (
          <div key={macro.name} className="flex flex-col items-center">
            {/* Gauge Container */}
            <div className="relative w-20 h-20 mb-2">
              <svg className="w-20 h-20" viewBox="0 0 100 100">
                {/* Gradient definitions */}
                <defs>
                  <linearGradient id={macro.gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
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
                  strokeWidth="8"
                />
                
                {/* Colored gauge arc */}
                <path
                  d="M 15 50 a 35 35 0 0 1 70 0"
                  fill="none"
                  stroke={`url(#${macro.gradientId})`}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                
                {/* Gauge needle */}
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="15"
                  stroke="#1f2937"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(${(macro.position / 100) * 180 - 90} 50 50)`}
                  style={{ transition: 'transform 0.5s ease-out' }}
                />
                
                {/* Center dot */}
                <circle cx="50" cy="50" r="3" fill="#1f2937" />
              </svg>
            </div>
            
            {/* Macro name and values */}
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{macro.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(macro.current)}g / {Math.round(macro.target)}g
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(macro.percentage)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
