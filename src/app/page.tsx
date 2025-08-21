import Chat from "@/components/Chat";
import FoodLogTable from "@/components/FoodLogTable";
import EncouragementBanner from "@/components/EncouragementBanner";
import CalorieGauge from "@/components/CalorieGauge";
import MacroGauges from "@/components/MacroGauges";

export default function Home() {
  return (
    <div className="font-sans min-h-screen">
      <EncouragementBanner />
      <div className="p-6 sm:p-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Chat />
          </div>
          <div className="lg:col-span-1 flex flex-col gap-6">
            <CalorieGauge />
            <MacroGauges />
            <FoodLogTable />
          </div>
        </div>

      </div>
      
      {/* Bottom Blur Effect - Fixed to Viewport */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-gray-900 via-white/60 dark:via-gray-900/60 to-transparent pointer-events-none z-10"></div>
    </div>
  );
}
