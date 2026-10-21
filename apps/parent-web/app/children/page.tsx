import type { Metadata } from "next";
import { ChildrenView } from "@/components/views/children-view";

export const metadata: Metadata = { title: "Children & permissions" };

export default function Page() {
  return <ChildrenView />;
}
