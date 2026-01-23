import { useState, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import LoginScreen from './components/Auth/LoginScreen';
import MainLayout from './components/Layout/MainLayout';

// Lazy load heavy components
const ReportsView = lazy(() => import('./components/Dashboard/ReportsView'));
const AlertsPanel = lazy(() => import('./components/Alerts/AlertsPanel'));
const SatellitePanel = lazy(() => import('./components/Satellite/SatellitePanel'));
const DataUpload = lazy(() => import('./components/Upload/DataUpload'));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

export type TabId = 'dashboard' | 'map' | 'reports' | 'alerts' | 'satellite' | 'settings';

export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { isAuthenticated, login } = useAuthStore();

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'map' && <MapOnlyView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'alerts' && <AlertsPanel />}
          {activeTab === 'satellite' && <SatellitePanel />}
          {activeTab === 'settings' && <DataUpload />}
        </Suspense>
      </ErrorBoundary>
    </MainLayout>
  );
}

// Dashboard view with KPIs, Map, and Charts
const DashboardView = lazy(() => import('./components/Dashboard/DashboardView'));
const MapOnlyView = lazy(() => import('./components/Dashboard/MapOnlyView'));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
      <ToastProvider />
    </QueryClientProvider>
  );
}
