import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Record from "./pages/Record";
import SessionDetail from "./pages/SessionDetail";
import Sessions from "./pages/Sessions";
import ShareVideo from "./pages/ShareVideo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <main className="flex-1">
                <div className="sticky top-0 z-10 glass-header backdrop-blur-xl border-b border-border/50 px-4 py-3">
                  <SidebarTrigger />
                </div>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/record" element={<Record />} />
                  <Route path="/session/:id" element={<SessionDetail />} />
                  <Route path="/sessions" element={<Sessions />} />
                  <Route path="/share/:shareToken" element={<ShareVideo />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
