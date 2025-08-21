import GoalsForm from "@/components/GoalsForm";
import Goals from "@/components/Goals";
import Bio from "@/components/Bio";
import MacroSplit from "@/components/MacroSplit";
import Image from "next/image";

export default function GoalsPage() {
  return (
    <div className="font-sans min-h-screen p-6 sm:p-10 flex flex-col items-center gap-6">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
          <img 
            src="/bio.jpg" 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Alex</h2>
        </div>
      </div>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Bio />
      </div>
      <div className="lg:col-span-1">
        <Goals />
      </div>
    </div>
    
        <GoalsForm />
    <MacroSplit />
    
    {/* TDEE Info Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-3">About Daily Calorie Targets</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Your daily calorie target comes from your Total Daily Energy Expenditure (TDEE) — an estimate of how many calories you burn each day. TDEE starts with your Basal Metabolic Rate (BMR), usually calculated using the Mifflin–St Jeor equation, and then adjusts for your activity level. Eating at this level maintains your weight; eating less or more can help you lose or gain.
          </p>
        </div>
      </div>
      
      {/* Bottom Blur Effect - Fixed to Viewport */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/60 to-transparent pointer-events-none z-10"></div>
    </div>
  );
}
