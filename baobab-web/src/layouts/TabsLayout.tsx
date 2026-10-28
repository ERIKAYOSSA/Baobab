import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

export function TabsLayout() {
  return (
    <div className="relative mx-auto min-h-dvh max-w-md bg-background pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))]">
      <Outlet />
      <BottomNav />
    </div>
  );
}
