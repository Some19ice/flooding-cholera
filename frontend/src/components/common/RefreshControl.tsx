import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/appStore';
import { queryKeys, useAutoRefresh } from '../../hooks/useApi';
import type { RefreshInterval } from '../../types';

const REFRESH_OPTIONS: { label: string; value: RefreshInterval }[] = [
  { label: 'Off', value: 0 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
];

export default function RefreshControl() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { refreshInterval, setRefreshInterval, lastRefreshed, setLastRefreshed } = useAppStore();

  // Auto-refresh effect
  useAutoRefresh(refreshInterval ? refreshInterval * 60 * 1000 : null);

  // Update last refreshed when data changes
  useEffect(() => {
    setLastRefreshed(new Date().toISOString());
  }, [setLastRefreshed]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.riskScores }),
      queryClient.invalidateQueries({ queryKey: queryKeys.geojson }),
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
    ]);
    setLastRefreshed(new Date().toISOString());
  };

  const handleIntervalChange = (interval: RefreshInterval) => {
    setRefreshInterval(interval);
    setIsOpen(false);
  };

  const currentOption = REFRESH_OPTIONS.find((o) => o.value === refreshInterval) || REFRESH_OPTIONS[0];

  return (
    <div ref={menuRef} className="relative flex items-center gap-2">
      {/* Last updated indicator */}
      {lastRefreshed && (
        <span className="text-xs text-gray-500 hidden sm:inline">
          Updated: {format(new Date(lastRefreshed), 'HH:mm')}
        </span>
      )}

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Refresh data"
        title="Refresh data"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {/* Auto-refresh interval selector */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
            refreshInterval > 0
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          aria-label="Auto-refresh settings"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{currentOption.label}</span>
          <svg
            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]"
            role="menu"
            aria-label="Auto-refresh options"
          >
            <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
              Auto-refresh
            </div>
            {REFRESH_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleIntervalChange(option.value)}
                className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                  refreshInterval === option.value
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitem"
                aria-current={refreshInterval === option.value}
              >
                {option.label}
                {refreshInterval === option.value && (
                  <svg
                    className="w-4 h-4 inline ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
