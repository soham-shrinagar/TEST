import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import MatchesPage from './pages/MatchesPage';
import DashboardPage from './pages/DashboardPage';
import InfluencerDashboardPage from './pages/creator/InfluencerDashboardPage';
import MessagesPage from './pages/MessagesPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import SessionsPage from './pages/SessionsPage';
import CampaignListPage from './pages/brand/CampaignListPage';
import CampaignCreatePage from './pages/brand/CampaignCreatePage';
import CampaignDashboardPage from './pages/brand/CampaignDashboardPage';
import CampaignEditPage from './pages/brand/CampaignEditPage';
import DealDiscoveryPage from './pages/creator/DealDiscoveryPage';
import DealDetailPage from './pages/creator/DealDetailPage';
import MyCampaignsPage from './pages/creator/MyCampaignsPage';
import CampaignWorkspacePage from './pages/creator/CampaignWorkspacePage';
import OAuthTokenHandler from './components/OAuthTokenHandler';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import StoreSignupPage from './pages/StoreSignupPage';
import StoreDashboardPage from './pages/store/StoreDashboardPage';
import StoreProfileEditPage from './pages/store/StoreProfileEditPage';
import StoreCreateDealPage from './pages/store/StoreCreateDealPage';
import StoreDealManagementPage from './pages/store/StoreDealManagementPage';
import StoreVisitWorkspacePage from './pages/creator/StoreVisitWorkspacePage';
import StoreProfilePage from './pages/creator/StoreProfilePage';
import BrowseStoresPage from './pages/creator/BrowseStoresPage';
import StoreDealDetailPage from './pages/creator/StoreDealDetailPage';

const postAuthPath = (user) => {
  if (!user.onboardingComplete) return '/onboarding';
  if (user.role === 'brand') return '/brand/dashboard';
  if (user.role === 'store') return '/store/dashboard';
  return '/creator/dashboard';
};

const hasRole = (user, roles) => user && roles.includes(user.role);

const App = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    const handlePointerMove = (event) => {
      document.documentElement.style.setProperty('--page-cursor-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--page-cursor-y', `${event.clientY}px`);
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <>
      <OAuthTokenHandler />
      {user ? <Navbar /> : null}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/register"
          element={!user ? <RegisterPage /> : <Navigate to={postAuthPath(user)} replace />}
        />
        <Route
          path="/login"
          element={loading ? null : !user ? <LoginPage /> : <Navigate to={postAuthPath(user)} replace />}
        />
        <Route path="/onboarding/role" element={<ProtectedRoute><RoleSelectionPage /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute requireOnboarding><FeedPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute requireOnboarding><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<ProtectedRoute requireOnboarding><ProfilePage /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute requireOnboarding><EditProfilePage /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute requireOnboarding><SessionsPage /></ProtectedRoute>} />
        <Route path="/matches" element={<ProtectedRoute requireOnboarding><MatchesPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute requireOnboarding><MessagesPage /></ProtectedRoute>} />
        {/* /dashboard: smart redirect — creators go to influencer dashboard, everyone else to generic */}
        <Route path="/dashboard" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['creator', 'influencer']) ? <InfluencerDashboardPage /> : <DashboardPage />}</ProtectedRoute>} />
        <Route path="/brand/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/creator/dashboard" element={<ProtectedRoute>{hasRole(user, ['creator', 'influencer']) ? <InfluencerDashboardPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/brand/campaigns" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['brand']) ? <CampaignListPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/brand/campaigns/new" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['brand']) ? <CampaignCreatePage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/brand/campaigns/:id/dashboard" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['brand']) ? <CampaignDashboardPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/brand/campaigns/:id/edit" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['brand']) ? <CampaignEditPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/creator/deals" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['creator', 'influencer']) ? <DealDiscoveryPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/creator/deals/:id" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['creator', 'influencer']) ? <DealDetailPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        {/* /creator/campaigns now redirects to the merged dashboard */}
        <Route path="/creator/campaigns" element={<ProtectedRoute requireOnboarding><Navigate to="/creator/dashboard" replace /></ProtectedRoute>} />
        <Route path="/signup/store" element={!user ? <StoreSignupPage /> : <Navigate to={postAuthPath(user)} replace />} />
        <Route path="/creator/campaigns/:id/workspace" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['creator', 'influencer']) ? <CampaignWorkspacePage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        {/* ─── Store routes ─── */}
        <Route path="/store/dashboard" element={<ProtectedRoute>{hasRole(user, ['store']) ? <StoreDashboardPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/store/profile/edit" element={<ProtectedRoute>{hasRole(user, ['store']) ? <StoreProfileEditPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/store/deals/new" element={<ProtectedRoute>{hasRole(user, ['store']) ? <StoreCreateDealPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/store/deals/:id" element={<ProtectedRoute>{hasRole(user, ['store']) ? <StoreDealManagementPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        {/* ─── Creator store routes ─── */}
        <Route path="/creator/stores" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['creator', 'influencer']) ? <BrowseStoresPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/creator/store-deals/:id" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['creator', 'influencer']) ? <StoreDealDetailPage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/creator/store-visits/:dealId" element={<ProtectedRoute requireOnboarding>{hasRole(user, ['creator', 'influencer']) ? <StoreVisitWorkspacePage /> : <Navigate to="/feed" replace />}</ProtectedRoute>} />
        <Route path="/store/:storeId" element={<ProtectedRoute requireOnboarding><StoreProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
