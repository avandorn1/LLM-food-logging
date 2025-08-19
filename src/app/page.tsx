import Chat from "@/components/Chat";
import Charts from "@/components/Charts";
import FoodLogTable from "@/components/FoodLogTable";
import EncouragementBanner from "@/components/EncouragementBanner";
import CalorieGauge from "@/components/CalorieGauge";

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
            <FoodLogTable />
          </div>
        </div>
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Charts />
          </div>
        </div>
      </div>
    </div>
  );
}
