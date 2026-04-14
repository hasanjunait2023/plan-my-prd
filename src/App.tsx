import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import TradeJournal from "./pages/TradeJournal.tsx";
import NewTrade from "./pages/NewTrade.tsx";
import Analytics from "./pages/Analytics.tsx";

import Settings from "./pages/Settings.tsx";
import CurrencyStrength from "./pages/CurrencyStrength.tsx";
import EmaScanner from "./pages/EmaScanner.tsx";
import TradeIntelligence from "./pages/TradeIntelligence.tsx";
import Commodities from "./pages/Commodities.tsx";

import CorrelationPairs from "./pages/CorrelationPairs.tsx";
import NotFound from "./pages/NotFound.tsx";
import Install from "./pages/Install.tsx";
import MT5Connection from "./pages/MT5Connection.tsx";
import ChartAnalysis from "./pages/ChartAnalysis.tsx";
import Auth from "./pages/Auth.tsx";
import TradingRules from "./pages/TradingRules.tsx";
import MarketNews from "./pages/MarketNews.tsx";
import HabitTracking from "./pages/HabitTracking.tsx";
import SpikeAlerts from "./pages/SpikeAlerts.tsx";
import MindJournal from "./pages/MindJournal.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<CurrencyStrength />} />
                  <Route path="/dashboard" element={<Index />} />
                  <Route path="/journal" element={<TradeJournal />} />
                  <Route path="/new-trade" element={<NewTrade />} />
                  <Route path="/analytics" element={<Analytics />} />
                  
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/currency-strength" element={<CurrencyStrength />} />
                  <Route path="/ema-scanner" element={<EmaScanner />} />
                  <Route path="/trade-intelligence" element={<TradeIntelligence />} />
                  <Route path="/commodities" element={<Commodities />} />
                  
                  <Route path="/correlation-pairs" element={<CorrelationPairs />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/mt5" element={<MT5Connection />} />
                  <Route path="/charts" element={<ChartAnalysis />} />
                  <Route path="/rules" element={<TradingRules />} />
                  <Route path="/news" element={<MarketNews />} />
                  <Route path="/habits" element={<HabitTracking />} />
                  <Route path="/spike-alerts" element={<SpikeAlerts />} />
                  <Route path="/mind-journal" element={<MindJournal />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
