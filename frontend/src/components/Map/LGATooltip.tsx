import type { RiskLevel } from '../../types';

interface LGATooltipProps {
  name: string;
  riskLevel: RiskLevel;
  riskScore?: number;
  recentCases?: number;
  recentDeaths?: number;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  unknown: '#6b7280',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  green: 'Low',
  yellow: 'Medium',
  red: 'High',
  unknown: 'Unknown',
};

export default function LGATooltip({
  name,
  riskLevel,
  riskScore,
  recentCases,
  recentDeaths,
}: LGATooltipProps) {
  const color = RISK_COLORS[riskLevel];
  const label = RISK_LABELS[riskLevel];

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 min-w-[180px]">
      <h3 className="font-semibold text-gray-900 mb-2">{name}</h3>

      <div className="flex items-center gap-2 mb-2">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${color}20`,
            color: color,
          }}
        >
          {label} Risk
        </span>
        {riskScore !== undefined && (
          <span className="text-xs text-gray-500">
            Score: {(riskScore * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {(recentCases !== undefined || recentDeaths !== undefined) && (
        <div className="text-xs text-gray-600 space-y-1">
          {recentCases !== undefined && (
            <div className="flex justify-between">
              <span>Recent Cases:</span>
              <span className="font-medium">{recentCases}</span>
            </div>
          )}
          {recentDeaths !== undefined && recentDeaths > 0 && (
            <div className="flex justify-between">
              <span>Deaths:</span>
              <span className="font-medium text-red-600">{recentDeaths}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
