import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectProvider } from "@/context/ProjectContext";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { NewProjectPage } from "@/pages/NewProjectPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { ValidationPage } from "@/pages/ValidationPage";
import { AdvisoriesPage } from "@/pages/AdvisoriesPage";
import { ReportPage } from "@/pages/ReportPage";
import { MethodsPage } from "@/pages/MethodsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ProjectProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/new" element={<NewProjectPage />} />
              <Route path="/project/:id" element={<WorkspacePage />} />
              <Route path="/project/:id/validation" element={<ValidationPage />} />
              <Route path="/project/:id/advisories" element={<AdvisoriesPage />} />
              <Route path="/project/:id/report" element={<ReportPage />} />
              <Route path="/methods" element={<MethodsPage />} />
              {/* CATCH-ALL ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </ProjectProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

