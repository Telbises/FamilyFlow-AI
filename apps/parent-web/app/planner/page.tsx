import type { Metadata } from "next";
import { PlannerView } from "@/components/views/planner-view";

export const metadata: Metadata = { title: "Weekly adventure planner" };

export default function Page() {
  return <PlannerView />;
}
