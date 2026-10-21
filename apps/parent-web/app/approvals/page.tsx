import type { Metadata } from "next";
import { ApprovalsView } from "@/components/views/approvals-view";

export const metadata: Metadata = { title: "Pending approvals" };

export default function Page() {
  return <ApprovalsView />;
}
