import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import ArtworkDetail from "./pages/ArtworkDetail";
import ArtistProfile from "./pages/ArtistProfile";
import Artists from "./pages/Artists";
import Commission from "./pages/Commission";
import Verification from "./pages/Verification";
import Policy from "./pages/Policy";
import Sell from "./pages/Sell";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminArtists from "./pages/admin/Artists";
import AdminVerifications from "./pages/admin/Verifications";
import AdminIdentityVerifications from "./pages/admin/IdentityVerifications";
import AdminArtworkVerifications from "./pages/admin/ArtworkVerifications";
import AdminTopupRequests from "./pages/admin/TopupRequests";
import AdminWithdrawalRequests from "./pages/admin/WithdrawalRequests";
import AdminReports from "./pages/admin/Reports";
import EditProfile from "./pages/artist/EditProfile";
import VerificationSubmit from "./pages/artist/VerificationSubmit";
import Earnings from "./pages/artist/Earnings";
import Withdraw from "./pages/artist/Withdraw";
import Wallet from "./pages/Wallet";
import MyOrders from "./pages/MyOrders";
import Community from "./pages/Community";
import SavedPosts from "./pages/SavedPosts";
import Followers from "./pages/Followers";
import UserProfile from "./pages/UserProfile";
import PrivacySettings from "./pages/PrivacySettings";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/artists" element={<AdminArtists />} />
            <Route path="/admin/verifications" element={<AdminVerifications />} />
            <Route path="/admin/identity-verifications" element={<AdminIdentityVerifications />} />
            <Route path="/admin/artwork-verifications" element={<AdminArtworkVerifications />} />
            <Route path="/admin/topup-requests" element={<AdminTopupRequests />} />
            <Route path="/admin/withdrawal-requests" element={<AdminWithdrawalRequests />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/artist/edit-profile" element={<EditProfile />} />
            <Route path="/artist/verification" element={<VerificationSubmit />} />
            <Route path="/artist/earnings" element={<Earnings />} />
            <Route path="/artist/withdraw" element={<Withdraw />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/community" element={<Community />} />
            <Route path="/saved" element={<SavedPosts />} />
            <Route path="/followers" element={<Followers />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            <Route path="/settings/privacy" element={<PrivacySettings />} />
            <Route path="/settings/change-password" element={<ChangePassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
