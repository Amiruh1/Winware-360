import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

export default function LayoutPrivado({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
