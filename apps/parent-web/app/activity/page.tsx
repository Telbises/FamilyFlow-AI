import type { Metadata } from "next";
import { ActivityView } from "@/components/views/activity-view";

export const metadata: Metadata = { title: "Activity history" };

export default function Page() {
  return <ActivityView />;
}
