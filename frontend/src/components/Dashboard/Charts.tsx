import { useRef } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useLgaAnalytics } from '../../hooks/useApi';
import { useAppStore } from '../../store/appStore';
import type { RiskLevel } from '../../types';
import ExportButton, { exportToCSV } from '../Export/ExportButton';

const RISK_COLORS: Record<RiskLevel, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  unknown: '#6b7280',
};

const DAY_PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  height?: number;
  chartRef?: React.RefObject<HTMLDivElement>;
  filename?: string;
  onExportCSV?: () => void;
}

function ChartContainer({
  title,
  children,
  height = 200,
  chartRef,
  filename,
  onExportCSV,
}: ChartContainerProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4" ref={chartRef}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <div className="flex items-center gap-1">
          {chartRef && filename && (
            <ExportButton targetRef={chartRef} filename={filename} />
          )}
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              aria-label="Export data as CSV"
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
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>CSV</span>
            </button>
          )}
        </div>
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}

export default function Charts() {
  const { selectedLGAId, analyticsDays, setAnalyticsDays } = useAppStore();
  const { data: analytics, isLoading: loading, error } = useLgaAnalytics(selectedLGAId, analyticsDays);

  const casesChartRef = useRef<HTMLDivElement>(null);
  const riskChartRef = useRef<HTMLDivElement>(null);
  const rainfallChartRef = useRef<HTMLDivElement>(null);

  if (!selectedLGAId) {
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
        <p className="text-gray-500">Select an LGA on the map to view detailed analytics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading analytics">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-40 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-4" role="alert">
        <p className="text-red-500 text-sm">
          {error instanceof Error ? error.message : 'Unable to load analytics'}
        </p>
      </div>
    );
  }

  // Prepare data for charts
  const rainfallData = analytics.rainfall_time_series.map((point) => ({
    date: point.date,
    rainfall: point.value,
  }));

  const riskData = analytics.risk_time_series.map((point) => ({
    date: point.date,
    risk: point.value * 100,
  }));

  // Combined data for multi-series chart
  const combinedData = analytics.cases_time_series.map((point, index) => ({
    date: point.date,
    cases: point.value,
    deaths: analytics.deaths_time_series[index]?.value || 0,
  }));

  const handleExportCasesCSV = () => {
    exportToCSV(
      combinedData.map((d) => ({
        date: d.date,
        cases: d.cases,
        deaths: d.deaths,
      })),
      `${analytics.lga_name}_cases_${analyticsDays}d`
    );
  };

  const handleExportRiskCSV = () => {
    exportToCSV(
      riskData.map((d) => ({
        date: d.date,
        risk_score_percent: d.risk,
      })),
      `${analytics.lga_name}_risk_${analyticsDays}d`
    );
  };

  const handleExportRainfallCSV = () => {
    exportToCSV(
      rainfallData.map((d) => ({
        date: d.date,
        rainfall_mm: d.rainfall,
      })),
      `${analytics.lga_name}_rainfall_${analyticsDays}d`
    );
  };

  return (
    <div className="space-y-4">
      {/* Selected LGA header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{analytics.lga_name}</h2>
            <p className="text-sm text-gray-500">Analytics for last {analyticsDays} days</p>
          </div>
          <div className="text-right">
            <span
              className="inline-block px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${RISK_COLORS[analytics.current_risk_level]}20`,
                color: RISK_COLORS[analytics.current_risk_level],
              }}
            >
              {analytics.current_risk_level.toUpperCase()} RISK
            </span>
            <p className="text-xs text-gray-500 mt-1">
              Avg Score: {(analytics.avg_risk_score * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Date range presets */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <span className="text-xs text-gray-500 mr-2">Period:</span>
          {DAY_PRESETS.map((preset) => (
            <button
              key={preset.days}
              onClick={() => setAnalyticsDays(preset.days)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                analyticsDays === preset.days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-pressed={analyticsDays === preset.days}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-500">Total Cases</p>
            <p className="text-xl font-bold text-gray-900">{analytics.total_cases}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Deaths</p>
            <p className="text-xl font-bold text-red-600">{analytics.total_deaths}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">CFR</p>
            <p className="text-xl font-bold text-gray-900">
              {analytics.total_cases > 0
                ? ((analytics.total_deaths / analytics.total_cases) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Cases and Deaths Chart */}
      {combinedData.length > 0 && (
        <ChartContainer
          title="Cases & Deaths Over Time"
          chartRef={casesChartRef}
          filename={`${analytics.lga_name}_cases_chart`}
          onExportCSV={handleExportCasesCSV}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedData}>
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="cases"
                stroke="#3b82f6"
                fill="#3b82f680"
                name="Cases"
              />
              <Area
                type="monotone"
                dataKey="deaths"
                stroke="#ef4444"
                fill="#ef444480"
                name="Deaths"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {/* Risk Score Trend */}
      {riskData.length > 0 && (
        <ChartContainer
          title="Risk Score Trend"
          chartRef={riskChartRef}
          filename={`${analytics.lga_name}_risk_chart`}
          onExportCSV={handleExportRiskCSV}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                labelFormatter={(label) => formatDate(label as string)}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Risk Score']}
                contentStyle={{ fontSize: 12 }}
              />
              {/* Risk level bands */}
              <Line
                type="monotone"
                dataKey="risk"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {/* Rainfall Chart */}
      {rainfallData.length > 0 && (
        <ChartContainer
          title="Rainfall (mm)"
          chartRef={rainfallChartRef}
          filename={`${analytics.lga_name}_rainfall_chart`}
          onExportCSV={handleExportRainfallCSV}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rainfallData}>
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
                formatter={(value: number) => [`${value.toFixed(1)} mm`, 'Rainfall']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="rainfall" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {/* No data message */}
      {combinedData.length === 0 && riskData.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">No historical data available for this LGA</p>
        </div>
      )}
    </div>
  );
}
