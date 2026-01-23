import { useState } from 'react';
import { useRiskScores, useDashboard, useLgaAnalytics } from '../../hooks/useApi';
import { useAppStore } from '../../store/appStore';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type ReportType = 'overview' | 'lga' | 'environmental' | 'trends';
type TimePeriod = '7d' | '30d' | '90d';

const RISK_COLORS = {
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
};

function ReportHeader({ title, subtitle, onExport }: { title: string; subtitle: string; onExport?: () => void }) {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h3 className="text-lg font-bold text-[#111518]">{title}</h3>
        <p className="text-[#637588] text-sm mt-1">{subtitle}</p>
      </div>
      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
          Export PDF
        </button>
      )}
    </div>
  );
}

function OverviewReport() {
  const { data: dashboard } = useDashboard();
  const { data: riskScores } = useRiskScores();

  const riskDistribution = [
    { name: 'High Risk', value: dashboard?.lgas_high_risk || 0, color: RISK_COLORS.red },
    { name: 'Medium Risk', value: dashboard?.lgas_medium_risk || 0, color: RISK_COLORS.yellow },
    { name: 'Low Risk', value: dashboard?.lgas_low_risk || 0, color: RISK_COLORS.green },
  ];

  const topRiskLGAs = riskScores
    ?.sort((a, b) => b.score - a.score)
    .slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <p className="text-[#637588] text-xs font-medium mb-1">Total LGAs</p>
          <p className="text-2xl font-bold text-[#111518]">{dashboard?.total_lgas || 18}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <p className="text-[#637588] text-xs font-medium mb-1">Cases (30d)</p>
          <p className="text-2xl font-bold text-alert-orange">{dashboard?.total_cases || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <p className="text-[#637588] text-xs font-medium mb-1">Deaths (30d)</p>
          <p className="text-2xl font-bold text-red-600">{dashboard?.total_deaths || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <p className="text-[#637588] text-xs font-medium mb-1">Avg Rainfall</p>
          <p className="text-2xl font-bold text-primary">{dashboard?.avg_rainfall_7day?.toFixed(0) || 0}mm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
          <h4 className="font-bold text-[#111518] mb-4">Risk Level Distribution</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Risk LGAs Table */}
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
          <h4 className="font-bold text-[#111518] mb-4">Top 5 At-Risk LGAs</h4>
          <div className="space-y-3">
            {topRiskLGAs.map((lga, idx) => (
              <div key={lga.lga_id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#637588] w-6">{idx + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-[#111518]">{lga.lga_name}</span>
                    <span className={`text-sm font-bold ${
                      lga.level === 'red' ? 'text-red-500' :
                      lga.level === 'yellow' ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {(lga.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-[#e6e8eb] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lga.level === 'red' ? 'bg-red-500' :
                        lga.level === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'
                      }`}
                      style={{ width: `${lga.score * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LGAReport() {
  const { selectedLGAId, selectedLGA } = useAppStore();
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const { data: analytics, isLoading } = useLgaAnalytics(selectedLGAId, days);

  if (!selectedLGAId) {
    return (
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-8 text-center">
        <span className="material-symbols-outlined text-[#637588] mb-3" style={{ fontSize: '48px' }}>location_on</span>
        <h4 className="font-bold text-[#111518] mb-2">No LGA Selected</h4>
        <p className="text-[#637588] text-sm">Click on an LGA on the map to view detailed reports</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* LGA Header */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-xl font-bold text-[#111518]">{selectedLGA?.name || analytics?.lga_name}</h4>
            <p className="text-[#637588] text-sm">Population: {selectedLGA?.population?.toLocaleString() || 'N/A'}</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as TimePeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p ? 'bg-primary text-white' : 'bg-[#f0f2f5] text-[#637588] hover:bg-[#e6e8eb]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <p className="text-[#637588] text-xs font-medium mb-1">Total Cases</p>
          <p className="text-2xl font-bold text-[#111518]">{analytics?.total_cases || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <p className="text-[#637588] text-xs font-medium mb-1">Deaths</p>
          <p className="text-2xl font-bold text-alert-orange">{analytics?.total_deaths || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <p className="text-[#637588] text-xs font-medium mb-1">CFR</p>
          <p className="text-2xl font-bold text-[#111518]">
            {analytics && analytics.total_cases > 0
              ? ((analytics.total_deaths / analytics.total_cases) * 100).toFixed(1)
              : 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <p className="text-[#637588] text-xs font-medium mb-1">Avg Risk</p>
          <p className={`text-2xl font-bold ${
            analytics?.current_risk_level === 'red' ? 'text-red-500' :
            analytics?.current_risk_level === 'yellow' ? 'text-yellow-500' : 'text-green-500'
          }`}>
            {((analytics?.avg_risk_score || 0) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Cases Chart */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <h4 className="font-bold text-[#111518] mb-4">Cases & Deaths Over Time</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics?.cases_time_series || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="value" name="Cases" stroke="#1392ec" fill="#1392ec" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Score Trend */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <h4 className="font-bold text-[#111518] mb-4">Risk Score Trend</h4>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics?.risk_time_series || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
              <Line type="monotone" dataKey="value" name="Risk Score" stroke="#fa6238" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function EnvironmentalReport() {
  const { data: riskScores } = useRiskScores();

  const rainfallData = riskScores?.map(score => ({
    name: score.lga_name,
    rainfall: score.rainfall_mm || 0,
    flood: (score.flood_score || 0) * 100,
  })).slice(0, 10) || [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <h4 className="font-bold text-[#111518] mb-4">Rainfall by LGA (Latest)</h4>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rainfallData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="rainfall" name="Rainfall (mm)" fill="#1392ec" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <h4 className="font-bold text-[#111518] mb-4">Flood Risk Score by LGA</h4>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rainfallData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} />
              <Bar dataKey="flood" name="Flood Risk" fill="#fa6238" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TrendsReport() {
  // Mock trend data - in real app would come from API
  const weeklyTrend = [
    { week: 'Week 1', cases: 45, deaths: 2 },
    { week: 'Week 2', cases: 62, deaths: 3 },
    { week: 'Week 3', cases: 89, deaths: 4 },
    { week: 'Week 4', cases: 124, deaths: 5 },
    { week: 'Week 5', cases: 156, deaths: 7 },
    { week: 'Week 6', cases: 142, deaths: 6 },
    { week: 'Week 7', cases: 118, deaths: 4 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <h4 className="font-bold text-[#111518] mb-4">Weekly Case Trend (Last 7 Weeks)</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="cases" name="Cases" stroke="#1392ec" fill="#1392ec" fillOpacity={0.3} />
              <Area type="monotone" dataKey="deaths" name="Deaths" stroke="#fa6238" fill="#fa6238" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <h4 className="font-bold text-[#111518] mb-4">Epidemic Curve Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#f0f2f5] rounded-lg p-4">
            <p className="text-[#637588] text-xs font-medium mb-1">Peak Week</p>
            <p className="text-xl font-bold text-[#111518]">Week 5</p>
            <p className="text-sm text-alert-orange">156 cases</p>
          </div>
          <div className="bg-[#f0f2f5] rounded-lg p-4">
            <p className="text-[#637588] text-xs font-medium mb-1">Current Trend</p>
            <p className="text-xl font-bold text-env-green">Declining</p>
            <p className="text-sm text-[#637588]">-24% from peak</p>
          </div>
          <div className="bg-[#f0f2f5] rounded-lg p-4">
            <p className="text-[#637588] text-xs font-medium mb-1">Avg CFR</p>
            <p className="text-xl font-bold text-[#111518]">4.1%</p>
            <p className="text-sm text-[#637588]">Below threshold</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsView() {
  const [activeReport, setActiveReport] = useState<ReportType>('overview');

  const reportTabs: { id: ReportType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'lga', label: 'LGA Report', icon: 'location_on' },
    { id: 'environmental', label: 'Environmental', icon: 'water_drop' },
    { id: 'trends', label: 'Trends', icon: 'trending_up' },
  ];

  const handleExport = () => {
    // In real app, would generate PDF
    alert('PDF export would be triggered here');
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-2 flex gap-2 overflow-x-auto">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeReport === tab.id
                ? 'bg-primary text-white'
                : 'text-[#637588] hover:bg-[#f0f2f5]'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Header */}
      <ReportHeader
        title={reportTabs.find(t => t.id === activeReport)?.label || 'Report'}
        subtitle={`Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        onExport={handleExport}
      />

      {/* Report Content */}
      {activeReport === 'overview' && <OverviewReport />}
      {activeReport === 'lga' && <LGAReport />}
      {activeReport === 'environmental' && <EnvironmentalReport />}
      {activeReport === 'trends' && <TrendsReport />}
    </div>
  );
}
