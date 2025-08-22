"use client";
import { useEffect, useState } from "react";

type DayData = {
  day: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedItems: number;
};

export default function LoggingStreak() {
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadStreak = async () => {
    setLoading(true);
    try {
      // Get 30 days of data to calculate streak
      const res = await fetch("/api/summary?days=30", { cache: "no-store" });
      const data = await res.json();
      const series = data.series || [];

      // Calculate consecutive days streak
      let currentStreak = 0;
      
      // Sort by date (newest first) and check for consecutive days
      const sortedDays = series
        .filter((day: DayData) => day.loggedItems > 0) // Only days with logged items
        .sort((a: DayData, b: DayData) => new Date(b.day).getTime() - new Date(a.day).getTime());

      if (sortedDays.length === 0) {
        setStreak(0);
        return;
      }

      // Check if today has been logged
      const now = new Date();
      const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
      const todayKey = easternDate.toISOString().slice(0, 10);

      // Calculate streak from most recent logged day
      let previousDate: Date | null = null;
      
      for (const day of sortedDays) {
        const currentDate = new Date(day.day);
        
        if (previousDate === null) {
          // First logged day
          currentStreak = 1;
          previousDate = currentDate;
        } else {
          // Check if this day is consecutive to the previous
          const dayDiff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 1) {
            // Consecutive day
            currentStreak++;
            previousDate = currentDate;
          } else {
            // Break in streak
            break;
          }
        }
      }

      setStreak(currentStreak);
    } catch (error) {
      console.error("Error loading streak data:", error);
      setStreak(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStreak();
  }, []);

  useEffect(() => {
    const handleUpdate = () => loadStreak();
    window.addEventListener("nutrition:update", handleUpdate);
    return () => window.removeEventListener("nutrition:update", handleUpdate);
  }, []);

  if (loading) {
    return (
      <div className="w-full border rounded-lg p-4">
        <div className="text-lg font-semibold mb-3">🔥 Logging Streak</div>
        <div className="w-full h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your streak today!";
    if (streak === 1) return "Great start! Keep it going!";
    if (streak < 7) return `${streak} day streak! You're building momentum!`;
    if (streak < 14) return `${streak} day streak! You're on fire! 🔥`;
    if (streak < 30) return `${streak} day streak! Incredible consistency! 🔥🔥`;
    return `${streak} day streak! You're unstoppable! 🔥🔥🔥`;
  };

  const getStreakEmoji = (streak: number) => {
    if (streak === 0) return "📝";
    if (streak < 3) return "🔥";
    if (streak < 7) return "🔥🔥";
    if (streak < 14) return "🔥🔥🔥";
    if (streak < 30) return "🔥🔥🔥🔥";
    return "🔥🔥🔥🔥🔥";
  };

  return (
    <div className="w-full border rounded-lg p-4">
      <div className="text-lg font-semibold mb-3">🔥 Logging Streak</div>
      
      <div className="text-center">
        <div className="text-4xl font-bold text-orange-600 mb-2">
          {getStreakEmoji(streak)}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {streak} {streak === 1 ? 'day' : 'days'}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {getStreakMessage(streak)}
        </div>
      </div>
    </div>
  );
}

