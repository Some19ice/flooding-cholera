import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../../store/appStore';
import { useLgaAnalytics } from '../../hooks/useApi';
import type { RiskLevel } from '../../types';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];
const RISK_COLORS: Record<RiskLevel, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  unknown: '#6b7280',
};

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}

interface CompareChartProps {
  title: string;
  dataKey: string;
  data: Array<{ date: string; [key: string]: number | string }>;
  lgaNames: string[];
}

function CompareChart({ title, dataKey, data, lgaNames }: CompareChartProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
            />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
            <Tooltip
              labelFormatter={(label) => formatDate(label as string)}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {lgaNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={`${name}_${dataKey}`}
                name={name}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface LGAStatRowProps {
  name: string;
  riskLevel: RiskLevel;
  riskScore: number;
  totalCases: number;
  totalDeaths: number;
  color: string;
  onRemove: () => void;
}

function LGAStatRow({
  name,
  riskLevel,
  riskScore,
  totalCases,
  totalDeaths,
  color,
  onRemove,
}: LGAStatRowProps) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span className="font-medium text-gray-900">{name}</span>
        </div>
      </td>
      <td className="py-2 px-3">
        <span
          className="px-2 py-0.5 text-xs font-medium rounded-full"
          style={{
            backgroundColor: `${RISK_COLORS[riskLevel]}20`,
            color: RISK_COLORS[riskLevel],
          }}
        >
          {riskLevel.toUpperCase()}
        </span>
      </td>
      <td className="py-2 px-3 text-sm text-gray-700">{(riskScore * 100).toFixed(0)}%</td>
      <td className="py-2 px-3 text-sm text-gray-700">{totalCases}</td>
      <td className="py-2 px-3 text-sm text-gray-700">{totalDeaths}</td>
      <td className="py-2 pl-3">
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
          aria-label={`Remove ${name} from comparison`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

export default function CompareView() {
  const { compareLGAIds, toggleCompareLGA, clearCompareLGAs, analyticsDays } = useAppStore();

  // Fetch analytics for each compared LGA
  const analytics1 = useLgaAnalytics(compareLGAIds[0] || null, analyticsDays);
  const analytics2 = useLgaAnalytics(compareLGAIds[1] || null, analyticsDays);
  const analytics3 = useLgaAnalytics(compareLGAIds[2] || null, analyticsDays);
  const analytics4 = useLgaAnalytics(compareLGAIds[3] || null, analyticsDays);

  const allAnalytics = [analytics1.data, analytics2.data, analytics3.data, analytics4.data].filter(
    Boolean
  );
  const isLoading = [analytics1, analytics2, analytics3, analytics4].some((a) => a.isLoading);

  // Merge time series data for comparison
  const mergedCasesData = useMemo(() => {
    if (allAnalytics.length === 0) return [];

    const dateMap: Record<string, { date: string; [key: string]: string | number }> = {};

    allAnalytics.forEach((analytics) => {
      if (!analytics) return;
      analytics.cases_time_series.forEach((point) => {
        if (!dateMap[point.date]) {
          dateMap[point.date] = { date: point.date };
        }
        dateMap[point.date][`${analytics.lga_name}_cases`] = point.value;
      });
    });

    return Object.values(dateMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [allAnalytics]);

  const mergedRiskData = useMemo(() => {
    if (allAnalytics.length === 0) return [];

    const dateMap: Record<string, { date: string; [key: string]: string | number }> = {};

    allAnalytics.forEach((analytics) => {
      if (!analytics) return;
      analytics.risk_time_series.forEach((point) => {
        if (!dateMap[point.date]) {
          dateMap[point.date] = { date: point.date };
        }
        dateMap[point.date][`${analytics.lga_name}_risk`] = point.value * 100;
      });
    });

    return Object.values(dateMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [allAnalytics]);

  if (compareLGAIds.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <svg
          className="w-12 h-12 mx-auto text-gray-300 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Compare LGAs</h3>
        <p className="text-sm text-gray-500">
          Select 2-4 LGAs on the map to compare their cholera risk metrics side by side.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Click on an LGA while holding Ctrl/Cmd to add it to comparison
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-40 bg-gray-100 rounded"></div>
          <div className="h-40 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Comparing {compareLGAIds.length} LGAs
          </h3>
          <button
            onClick={clearCompareLGAs}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>

        {/* Statistics Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500">LGA</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">Risk</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">Score</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">Cases</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">Deaths</th>
                <th className="py-2 pl-3 text-left text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {allAnalytics.map((analytics, index) => {
                const lgaId = compareLGAIds[index];
                return (
                  <LGAStatRow
                    key={lgaId}
                    name={analytics?.lga_name || 'Unknown'}
                    riskLevel={analytics?.current_risk_level || 'unknown'}
                    riskScore={analytics?.avg_risk_score || 0}
                    totalCases={analytics?.total_cases || 0}
                    totalDeaths={analytics?.total_deaths || 0}
                    color={COLORS[index % COLORS.length]}
                    onRemove={() => toggleCompareLGA(lgaId)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Charts */}
      {allAnalytics.length >= 2 && (
        <>
          <CompareChart
            title="Cases Comparison"
            dataKey="cases"
            data={mergedCasesData as Array<{ date: string; [key: string]: number | string }>}
            lgaNames={allAnalytics.map((a) => a?.lga_name || '')}
          />
          <CompareChart
            title="Risk Score Comparison"
            dataKey="risk"
            data={mergedRiskData as Array<{ date: string; [key: string]: number | string }>}
            lgaNames={allAnalytics.map((a) => a?.lga_name || '')}
          />
        </>
      )}
    </div>
  );
}
