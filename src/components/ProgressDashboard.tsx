"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

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
  const [goals, setGoals] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get goals for calculations
      const goalsRes = await fetch("/api/goals");
      const goalsData = await goalsRes.json();
      setGoals(goalsData);

      // Get 14 days of data
      const summaryRes = await fetch("/api/summary?days=14");
      const summaryData = await summaryRes.json();
      
      // Transform data for charts
      const transformedData = summaryData.map((day: any) => ({
        day: new Date(day.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calories: day.calories || 0,
        protein: day.protein || 0,
        carbs: day.carbs || 0,
        fat: day.fat || 0,
        loggedItems: day.loggedItems || 0,
      }));

      setData(transformedData);

      // Calculate statistics
      const nonZeroDays = transformedData.filter(d => d.calories > 0);
      const totalDaysLogged = nonZeroDays.length;
      const averageCalories = totalDaysLogged > 0 ? Math.round(nonZeroDays.reduce((sum, d) => sum + d.calories, 0) / totalDaysLogged) : 0;
      const averageProtein = totalDaysLogged > 0 ? Math.round(nonZeroDays.reduce((sum, d) => sum + d.protein, 0) / totalDaysLogged) : 0;
      const averageCarbs = totalDaysLogged > 0 ? Math.round(nonZeroDays.reduce((sum, d) => sum + d.carbs, 0) / totalDaysLogged) : 0;
      const averageFat = totalDaysLogged > 0 ? Math.round(nonZeroDays.reduce((sum, d) => sum + d.fat, 0) / totalDaysLogged) : 0;
      const totalItemsLogged = transformedData.reduce((sum, d) => sum + d.loggedItems, 0);

      // Calculate goal consistency
      const targetCalories = goalsData?.targetCalories || 2000;
      const daysWithinGoal = nonZeroDays.filter(d => 
        d.calories >= targetCalories * 0.8 && d.calories <= targetCalories * 1.2
      ).length;
      const goalConsistency = totalDaysLogged > 0 ? Math.round((daysWithinGoal / totalDaysLogged) * 100) : 0;

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
        <div className="text-2xl font-bold mb-6">Progress Dashboard</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border rounded-lg p-6 animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="text-2xl font-bold mb-6">Progress Dashboard</div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Days Logged</div>
          <div className="text-2xl font-bold">{stats?.totalDaysLogged || 0}/14</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Avg Calories</div>
          <div className="text-2xl font-bold">{stats?.averageCalories || 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Items</div>
          <div className="text-2xl font-bold">{stats?.totalItemsLogged || 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Goal Consistency</div>
          <div className="text-2xl font-bold">{stats?.goalConsistency || 0}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Calorie Trend */}
        <div className="bg-white border rounded-lg p-6">
          <div className="text-lg font-semibold mb-4">Calorie Trend (14 Days)</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
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
        <div className="bg-white border rounded-lg p-6">
          <div className="text-lg font-semibold mb-4">Average Macro Distribution</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Protein', value: stats?.averageProtein || 0 },
                  { name: 'Carbs', value: stats?.averageCarbs || 0 },
                  { name: 'Fat', value: stats?.averageFat || 0 },
                ]}
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
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm">Protein: {stats?.averageProtein || 0}g</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm">Carbs: {stats?.averageCarbs || 0}g</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-sm">Fat: {stats?.averageFat || 0}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <div className="text-lg font-semibold mb-4">Daily Breakdown</div>
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
