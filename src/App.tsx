import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import ArtworkDetail from "./pages/ArtworkDetail";
import ArtistProfile from "./pages/ArtistProfile";
import Artists from "./pages/Artists";
import Commission from "./pages/Commission";
import Verification from "./pages/Verification";
import Policy from "./pages/Policy";
import Sell from "./pages/Sell";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/artwork/:id" element={<ArtworkDetail />} />
          <Route path="/artist/:id" element={<ArtistProfile />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/commission" element={<Commission />} />
          <Route path="/verification" element={<Verification />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
