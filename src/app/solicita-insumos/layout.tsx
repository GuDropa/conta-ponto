import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col bg-background">{children}</div>
  );
}
