import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LGA, GeoJSONFeatureCollection, RiskScore, DashboardSummary, LGAAnalytics, RefreshInterval, FilterState } from '../types';

interface AppState {
  // LGA data
  lgas: LGA[];
  geojson: GeoJSONFeatureCollection | null;
  selectedLGA: LGA | null;
  selectedLGAId: number | null;

  // Risk scores
  riskScores: RiskScore[];

  // Dashboard
  dashboardSummary: DashboardSummary | null;

  // Analytics
  selectedLGAAnalytics: LGAAnalytics | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Filters
  filters: FilterState;

  // Date range for analytics
  analyticsDays: number;

  // Auto-refresh settings
  refreshInterval: RefreshInterval;
  lastRefreshed: string | null;

  // Compare mode
  compareLGAIds: number[];

  // Sidebar collapsed state
  sidebarCollapsed: boolean;

  // Actions
  setLgas: (lgas: LGA[]) => void;
  setGeojson: (geojson: GeoJSONFeatureCollection) => void;
  setSelectedLGA: (lga: LGA | null) => void;
  setSelectedLGAId: (id: number | null) => void;
  setRiskScores: (scores: RiskScore[]) => void;
  setDashboardSummary: (summary: DashboardSummary) => void;
  setSelectedLGAAnalytics: (analytics: LGAAnalytics | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setAnalyticsDays: (days: number) => void;
  setRefreshInterval: (interval: RefreshInterval) => void;
  setLastRefreshed: (timestamp: string) => void;
  toggleCompareLGA: (lgaId: number) => void;
  clearCompareLGAs: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const defaultFilters: FilterState = {
  showHighRisk: true,
  showMediumRisk: true,
  showLowRisk: true,
  dateRange: {
    startDate: null,
    endDate: null,
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      lgas: [],
      geojson: null,
      selectedLGA: null,
      selectedLGAId: null,
      riskScores: [],
      dashboardSummary: null,
      selectedLGAAnalytics: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      filters: defaultFilters,
      analyticsDays: 90,
      refreshInterval: 0,
      lastRefreshed: null,
      compareLGAIds: [],
      sidebarCollapsed: false,

      // Actions
      setLgas: (lgas) => set({ lgas }),
      setGeojson: (geojson) => set({ geojson }),
      setSelectedLGA: (lga) => set({ selectedLGA: lga, selectedLGAId: lga?.id || null }),
      setSelectedLGAId: (id) => set({ selectedLGAId: id }),
      setRiskScores: (scores) => set({ riskScores: scores }),
      setDashboardSummary: (summary) => set({ dashboardSummary: summary }),
      setSelectedLGAAnalytics: (analytics) => set({ selectedLGAAnalytics: analytics }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),
      setAnalyticsDays: (days) => set({ analyticsDays: days }),
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      setLastRefreshed: (timestamp) => set({ lastRefreshed: timestamp }),
      toggleCompareLGA: (lgaId) => set((state) => {
        const ids = state.compareLGAIds;
        if (ids.includes(lgaId)) {
          return { compareLGAIds: ids.filter((id) => id !== lgaId) };
        }
        if (ids.length >= 4) {
          return state; // Max 4 LGAs for comparison
        }
        return { compareLGAIds: [...ids, lgaId] };
      }),
      clearCompareLGAs: () => set({ compareLGAIds: [] }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'cholera-surveillance-store',
      partialize: (state) => ({
        refreshInterval: state.refreshInterval,
        filters: state.filters,
        analyticsDays: state.analyticsDays,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
