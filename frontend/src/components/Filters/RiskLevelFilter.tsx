import type { RiskLevel } from '../../types';
import { useAppStore } from '../../store/appStore';

const RISK_COLORS: Record<RiskLevel, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  unknown: '#6b7280',
};

interface FilterCheckboxProps {
  label: string;
  color: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  count?: number;
}

function FilterCheckbox({ label, color, checked, onChange, count }: FilterCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
          aria-label={`Show ${label} risk LGAs`}
        />
        <div
          className={`w-4 h-4 rounded border-2 transition-colors peer-focus:ring-2 peer-focus:ring-offset-1 peer-focus:ring-blue-500 ${
            checked ? 'border-transparent' : 'border-gray-300 bg-white'
          }`}
          style={{ backgroundColor: checked ? color : undefined }}
        >
          {checked && (
            <svg
              className="w-full h-full text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-500">({count})</span>
      )}
    </label>
  );
}

interface RiskLevelFilterProps {
  highRiskCount?: number;
  mediumRiskCount?: number;
  lowRiskCount?: number;
  className?: string;
  compact?: boolean;
}

export default function RiskLevelFilter({
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  className = '',
  compact = false,
}: RiskLevelFilterProps) {
  const { filters, setFilters } = useAppStore();

  const handleShowOnlyHighRisk = () => {
    setFilters({
      showHighRisk: true,
      showMediumRisk: false,
      showLowRisk: false,
    });
  };

  const handleShowAll = () => {
    setFilters({
      showHighRisk: true,
      showMediumRisk: true,
      showLowRisk: true,
    });
  };

  const allSelected = filters.showHighRisk && filters.showMediumRisk && filters.showLowRisk;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <FilterCheckbox
          label="High"
          color={RISK_COLORS.red}
          checked={filters.showHighRisk}
          onChange={(checked) => setFilters({ showHighRisk: checked })}
          count={highRiskCount}
        />
        <FilterCheckbox
          label="Medium"
          color={RISK_COLORS.yellow}
          checked={filters.showMediumRisk}
          onChange={(checked) => setFilters({ showMediumRisk: checked })}
          count={mediumRiskCount}
        />
        <FilterCheckbox
          label="Low"
          color={RISK_COLORS.green}
          checked={filters.showLowRisk}
          onChange={(checked) => setFilters({ showLowRisk: checked })}
          count={lowRiskCount}
        />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Filter by Risk Level</h3>
        {!allSelected ? (
          <button
            onClick={handleShowAll}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            aria-label="Show all risk levels"
          >
            Show All
          </button>
        ) : (
          <button
            onClick={handleShowOnlyHighRisk}
            className="text-xs text-red-600 hover:text-red-700 transition-colors"
            aria-label="Show only high risk LGAs"
          >
            High Risk Only
          </button>
        )}
      </div>

      <div className="space-y-2">
        <FilterCheckbox
          label="High Risk"
          color={RISK_COLORS.red}
          checked={filters.showHighRisk}
          onChange={(checked) => setFilters({ showHighRisk: checked })}
          count={highRiskCount}
        />
        <FilterCheckbox
          label="Medium Risk"
          color={RISK_COLORS.yellow}
          checked={filters.showMediumRisk}
          onChange={(checked) => setFilters({ showMediumRisk: checked })}
          count={mediumRiskCount}
        />
        <FilterCheckbox
          label="Low Risk"
          color={RISK_COLORS.green}
          checked={filters.showLowRisk}
          onChange={(checked) => setFilters({ showLowRisk: checked })}
          count={lowRiskCount}
        />
      </div>
    </div>
  );
}
