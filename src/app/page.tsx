import Chat from "@/components/Chat";
import Charts from "@/components/Charts";
import FoodLogTable from "@/components/FoodLogTable";

export default function Home() {
  return (
    <div className="font-sans min-h-screen p-6 sm:p-10">
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Chat />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <FoodLogTable />
          <Charts />
        </div>
      </div>
    </div>
  );
}
