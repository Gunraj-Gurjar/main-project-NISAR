import React from "react";
import { TopBar } from "./TopBar";
import { DisclaimerBanner } from "./DisclaimerBanner";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top Bar */}
      <TopBar />

      {/* Persistent Slim Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
    </div>
  );
};
