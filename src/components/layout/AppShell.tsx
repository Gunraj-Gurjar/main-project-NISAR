import React from "react";
import { useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const isWorkspace = Boolean(location.pathname.match(/^\/project\/[^/]+$/));

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground",
        isWorkspace ? "h-screen overflow-hidden" : "min-h-screen"
      )}
    >
      {/* Top Bar */}
      <TopBar />

      {/* Persistent Slim Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Main Content Area */}
      <main className="flex-1 w-full min-h-0 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
};
