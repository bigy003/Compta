"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "./AuthGuard";
import { ChatWidget } from "./ChatWidget";
import { Sidebar } from "./Sidebar";
import AlertesWidget from "./AlertesWidget";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/";

  return (
    <AuthGuard>
      {!isLoginPage && <Sidebar />}
      <main className={!isLoginPage ? "ml-64 min-h-screen" : ""}>
        {children}
      </main>
      {!isLoginPage && <ChatWidget />}
      {!isLoginPage && <AlertesWidget />}
    </AuthGuard>
  );
}
