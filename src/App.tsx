import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index.tsx";
import TradeJournal from "./pages/TradeJournal.tsx";
import NewTrade from "./pages/NewTrade.tsx";
import Analytics from "./pages/Analytics.tsx";
import Psychology from "./pages/Psychology.tsx";
import Settings from "./pages/Settings.tsx";
import CurrencyStrength from "./pages/CurrencyStrength.tsx";
import EmaScanner from "./pages/EmaScanner.tsx";
import TradeIntelligence from "./pages/TradeIntelligence.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/journal" element={<TradeJournal />} />
            <Route path="/new-trade" element={<NewTrade />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/psychology" element={<Psychology />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/currency-strength" element={<CurrencyStrength />} />
            <Route path="/ema-scanner" element={<EmaScanner />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
