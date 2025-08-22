"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ReferenceArea } from "recharts";

interface DayData {
  day: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedItems: number;
}

interface ProgressStats {
  totalDaysLogged: number;
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  totalItemsLogged: number;
  goalConsistency: number; // percentage of days within calorie goal
}

export default function ProgressDashboard() {
  const [data, setData] = useState<DayData[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [goals, setGoals] = useState<{ targetCalories?: number; targetProtein?: number; targetCarbs?: number; targetFat?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressReview, setProgressReview] = useState<string>("");
  const [reviewLoading, setReviewLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setReviewLoading(true);
    try {
      // Get goals for calculations
      const goalsRes = await fetch("/api/goals");
      const goalsData = await goalsRes.json();
      setGoals(goalsData.goal); // Access the goal property

      // Get 14 days of data
      const summaryRes = await fetch("/api/summary?days=14");
      const summaryData = await summaryRes.json();
      
      // Get progress review
      const reviewRes = await fetch("/api/progress-review");
      const reviewData = await reviewRes.json();
      setProgressReview(reviewData.message);
      
      // Transform data for charts - the API returns { series, goal }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedData = summaryData.series?.map((day: any) => {
        // Parse the date string (format: "2025-08-19")
        const dateParts = day.day.split('-');
        const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        
        return {
          day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          calories: day.calories || 0,
          protein: day.protein || 0,
          carbs: day.carbs || 0,
          fat: day.fat || 0,
          loggedItems: day.loggedItems || 0,
        };
      }) || [];

      setData(transformedData);

      // Calculate statistics
      const nonZeroDays = transformedData.filter((d: DayData) => d.calories > 0);
      const totalDaysLogged = nonZeroDays.length;
      const averageCalories = totalDaysLogged > 0 ? Math.round(nonZeroDays.reduce((sum: number, d: DayData) => sum + d.calories, 0) / totalDaysLogged) : 0;
      const averageProtein = totalDaysLogged > 0 ? Math.round(nonZeroDays.reduce((sum: number, d: DayData) => sum + d.protein, 0) / totalDaysLogged) : 0;
      const averageCarbs = totalDaysLogged > 0 ? Math.round(nonZeroDays.reduce((sum: number, d: DayData) => sum + d.carbs, 0) / totalDaysLogged) : 0;
      const averageFat = totalDaysLogged > 0 ? Math.round(nonZeroDays.reduce((sum: number, d: DayData) => sum + d.fat, 0) / totalDaysLogged) : 0;
      const totalItemsLogged = transformedData.reduce((sum: number, d: DayData) => sum + d.loggedItems, 0);

      // Calculate goal consistency - days in the sweet spot (90-110% of target)
      const targetCalories = goalsData.goal?.targetCalories || 2000;
      const daysInSweetSpot = nonZeroDays.filter((d: DayData) => 
        d.calories >= targetCalories * 0.9 && d.calories <= targetCalories * 1.1
      ).length;
      const goalConsistency = totalDaysLogged > 0 ? Math.round((daysInSweetSpot / totalDaysLogged) * 100) : 0;

      setStats({
        totalDaysLogged,
        averageCalories,
        averageProtein,
        averageCarbs,
        averageFat,
        totalItemsLogged,
        goalConsistency,
      });

    } catch (error) {
      console.error("Error loading progress data:", error);
    } finally {
      setLoading(false);
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener("nutrition:update", handleUpdate);
    return () => window.removeEventListener("nutrition:update", handleUpdate);
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Progress Dashboard</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      
      {/* Disclaimer */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 dark:text-blue-400 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <div className="font-medium mb-1">🎯 Remember: Consistency Over Perfection!</div>
            <div>These numbers are AI estimates to help you build better habits. Don&apos;t stress about perfect accuracy - the real win is showing up and logging regularly. Keep up the great work! 💪</div>
          </div>
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Days Logged ({stats?.totalDaysLogged || 0}/14)</div>
          <div className="grid grid-cols-7 gap-3">
            {data.map((day, index) => (
              <div
                key={index}
                className={`w-10 h-10 rounded-lg border-2 shadow-sm transition-all duration-200 hover:scale-110 ${
                  day.calories > 0 
                    ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-500 shadow-green-200' 
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300 shadow-gray-100'
                }`}
                title={`${day.day}: ${day.calories > 0 ? 'Logged' : 'Not logged'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Calorie Trend */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Calories Logged</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="day" 
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis domain={[0, goals?.targetCalories ? goals.targetCalories * 1.3 : 'auto']} />
              <Tooltip />
              {goals?.targetCalories && (
                <ReferenceArea 
                  y1={goals.targetCalories * 0.9} 
                  y2={goals.targetCalories * 1.1} 
                  fill="#22c55e" 
                  fillOpacity={0.2}
                  ifOverflow="visible"
                />
              )}
              <Line type="monotone" dataKey="calories" stroke="#3b82f6" strokeWidth={2} />
              {goals?.targetCalories && (
                <Line 
                  type="monotone" 
                  dataKey={() => goals.targetCalories} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  strokeWidth={1}
                  name="Goal"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Macro Distribution */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Macro Trends</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={(() => {
                  const total = (stats?.averageProtein || 0) + (stats?.averageCarbs || 0) + (stats?.averageFat || 0);
                  if (total === 0) return [
                    { name: 'Protein', value: 0 },
                    { name: 'Carbs', value: 0 },
                    { name: 'Fat', value: 0 },
                  ];
                  
                  return [
                    { name: 'Protein', value: Math.round(((stats?.averageProtein || 0) / total) * 100) },
                    { name: 'Carbs', value: Math.round(((stats?.averageCarbs || 0) / total) * 100) },
                    { name: 'Fat', value: Math.round(((stats?.averageFat || 0) / total) * 100) },
                  ];
                })()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Protein: {(() => {
                const total = (stats?.averageProtein || 0) + (stats?.averageCarbs || 0) + (stats?.averageFat || 0);
                return total > 0 ? Math.round(((stats?.averageProtein || 0) / total) * 100) : 0;
              })()}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Carbs: {(() => {
                const total = (stats?.averageProtein || 0) + (stats?.averageCarbs || 0) + (stats?.averageFat || 0);
                return total > 0 ? Math.round(((stats?.averageCarbs || 0) / total) * 100) : 0;
              })()}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Fat: {(() => {
                const total = (stats?.averageProtein || 0) + (stats?.averageCarbs || 0) + (stats?.averageFat || 0);
                return total > 0 ? Math.round(((stats?.averageFat || 0) / total) * 100) : 0;
              })()}%</span>
            </div>
          </div>
          
          {/* Goals Display */}
          {goals && (goals.targetProtein || goals.targetCarbs || goals.targetFat) && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-4 text-sm">
                <div className="font-medium text-gray-700 dark:text-gray-300">Your Goals:</div>
                <span className="text-gray-600 dark:text-gray-400">Protein: {(() => {
                  const total = (goals.targetProtein || 0) + (goals.targetCarbs || 0) + (goals.targetFat || 0);
                  return total > 0 ? Math.round(((goals.targetProtein || 0) / total) * 100) : 0;
                })()}%</span>
                <span className="text-gray-600 dark:text-gray-400">Carbs: {(() => {
                  const total = (goals.targetProtein || 0) + (goals.targetCarbs || 0) + (goals.targetFat || 0);
                  return total > 0 ? Math.round(((goals.targetCarbs || 0) / total) * 100) : 0;
                })()}%</span>
                <span className="text-gray-600 dark:text-gray-400">Fat: {(() => {
                  const total = (goals.targetProtein || 0) + (goals.targetCarbs || 0) + (goals.targetFat || 0);
                  return total > 0 ? Math.round(((goals.targetFat || 0) / total) * 100) : 0;
                })()}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Blur Effect - Fixed to Viewport */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-gray-900 via-white/60 dark:via-gray-900/60 to-transparent pointer-events-none z-10"></div>

      {/* Progress Review */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
        <div className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">📊 Weekly Progress Review</div>
        {reviewLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ) : (
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {progressReview}
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">Generated by AI</div>
          </div>
        )}
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Daily Breakdown</div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="calories" fill="#3b82f6" name="Calories" />
            <Bar dataKey="protein" fill="#10b981" name="Protein (g)" />
            <Bar dataKey="carbs" fill="#f59e0b" name="Carbs (g)" />
            <Bar dataKey="fat" fill="#ef4444" name="Fat (g)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
