import { useDashboard } from '../../hooks/useApi';
import ChoroplethMap from '../Map/ChoroplethMap';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  trend?: { value: string; isPositive: boolean };
  subtitle?: string;
}

function KPICard({ title, value, icon, iconColor, trend, subtitle }: KPICardProps) {
  const bgColor = iconColor === 'primary' ? 'bg-primary/10 text-primary'
    : iconColor === 'orange' ? 'bg-alert-orange/10 text-alert-orange'
    : 'bg-env-green/10 text-env-green';

  return (
    <div className="rounded-xl border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[#637588] text-sm font-medium">{title}</p>
        <span className={`material-symbols-outlined ${bgColor} p-1.5 rounded-lg`} style={{ fontSize: '20px' }}>
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight mb-1 text-[#111518]">{value}</p>
      {trend && (
        <p className={`text-sm font-medium flex items-center gap-1 ${trend.isPositive ? 'text-env-green' : 'text-alert-orange'}`}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {trend.isPositive ? 'trending_down' : 'trending_up'}
          </span>
          {trend.value}
        </p>
      )}
      {subtitle && !trend && (
        <p className="text-[#637588] text-sm font-medium">{subtitle}</p>
      )}
    </div>
  );
}

function SatelliteFeed() {
  // Mock satellite images for demo
  const satelliteImages = [
    { label: 'Calabar South', time: '10:42 AM', color: 'red' },
    { label: 'Odukpani', time: '09:15 AM', color: 'red' },
    { label: 'Akamkpa', time: '08:30 AM', color: 'yellow' },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#e6e8eb] flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-[#e6e8eb] flex justify-between items-center">
        <h3 className="font-bold text-[#111518] text-sm">Environmental Feed</h3>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">LIVE</span>
      </div>
      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
        {satelliteImages.map((img, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            <div
              className="aspect-video w-full rounded-lg relative overflow-hidden group cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${img.color === 'red' ? '#fef2f2' : '#fefce8'} 0%, ${img.color === 'red' ? '#fee2e2' : '#fef9c3'} 100%)`
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`material-symbols-outlined ${img.color === 'red' ? 'text-red-400' : 'text-yellow-400'}`} style={{ fontSize: '48px' }}>
                  satellite_alt
                </span>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white">
                {img.label} • {img.time}
              </div>
              <div className={`absolute top-2 right-2 size-3 rounded-full ${img.color === 'red' ? 'bg-red-500' : 'bg-yellow-500'} animate-pulse`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseRainfallChart() {
  return (
    <div className="bg-white rounded-xl border border-[#e6e8eb] p-6 flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-base font-bold text-[#111518]">Case Rate vs. Precipitation</h3>
          <p className="text-[#637588] text-sm mt-1">Correlation over past 7 days</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary"></span>
            <span className="text-xs text-[#637588]">Rainfall</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-alert-orange"></span>
            <span className="text-xs text-[#637588]">Cases</span>
          </div>
        </div>
      </div>
      <div className="relative h-[200px] w-full">
        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-[#e6e8eb] w-full h-0"></div>
          ))}
        </div>
        {/* Chart SVG */}
        <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 400 150">
          <defs>
            <linearGradient id="gradientRain" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1392ec"></stop>
              <stop offset="100%" stopColor="#1392ec" stopOpacity="0"></stop>
            </linearGradient>
          </defs>
          {/* Rainfall Area */}
          <path
            d="M0 120 C40 120, 50 80, 80 60 C110 40, 140 90, 180 80 C220 70, 250 30, 300 40 C350 50, 360 100, 400 90 V150 H0 Z"
            fill="url(#gradientRain)"
            opacity="0.3"
          />
          <path
            d="M0 120 C40 120, 50 80, 80 60 C110 40, 140 90, 180 80 C220 70, 250 30, 300 40 C350 50, 360 100, 400 90"
            fill="none"
            stroke="#1392ec"
            strokeWidth="2"
          />
          {/* Cases Line */}
          <path
            d="M0 130 C40 130, 60 110, 80 100 C120 80, 150 110, 190 100 C230 90, 260 50, 310 50 C340 50, 370 70, 400 40"
            fill="none"
            stroke="#fa6238"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
      </div>
      <div className="flex justify-between mt-2 px-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <span key={day} className="text-xs text-[#637588]">{day}</span>
        ))}
      </div>
    </div>
  );
}

function FloodingRiskChart() {
  const regions = [
    { name: 'Calabar South', risk: 85, color: 'bg-alert-orange' },
    { name: 'Odukpani', risk: 72, color: 'bg-alert-orange' },
    { name: 'Akamkpa', risk: 54, color: 'bg-primary' },
    { name: 'Biase', risk: 45, color: 'bg-primary' },
    { name: 'Yakuur', risk: 28, color: 'bg-env-green' },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#e6e8eb] p-6 flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-base font-bold text-[#111518]">Flooding Risk by LGA</h3>
          <p className="text-[#637588] text-sm mt-1">Current risk based on water levels</p>
        </div>
        <span className="bg-alert-orange/20 text-alert-orange text-xs font-bold px-2 py-1 rounded">CRITICAL</span>
      </div>
      <div className="flex flex-col gap-4 flex-1 justify-center">
        {regions.map((region) => (
          <div key={region.name} className="grid grid-cols-[100px_1fr_40px] items-center gap-3">
            <span className="text-sm font-medium text-[#637588] truncate">{region.name}</span>
            <div className="h-3 w-full bg-[#e6e8eb] rounded-full overflow-hidden">
              <div className={`h-full ${region.color} rounded-full transition-all`} style={{ width: `${region.risk}%` }}></div>
            </div>
            <span className="text-sm font-bold text-[#111518] text-right">{region.risk}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardView() {
  const { data: dashboard, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const alertLevel = (dashboard?.lgas_high_risk || 0) > 0 ? 'High' :
                     (dashboard?.lgas_medium_risk || 0) > 0 ? 'Medium' : 'Low';

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Confirmed Cases"
          value={dashboard?.total_cases || 0}
          icon="coronavirus"
          iconColor="primary"
          trend={{ value: `${dashboard?.lgas_high_risk || 0} high-risk LGAs`, isPositive: false }}
        />
        <KPICard
          title="Active Outbreaks"
          value={dashboard?.lgas_high_risk || 0}
          icon="warning"
          iconColor="orange"
          trend={{ value: `+${dashboard?.lgas_medium_risk || 0} at-risk`, isPositive: false }}
        />
        <KPICard
          title="Alert Level"
          value={alertLevel}
          icon="notifications_active"
          iconColor="orange"
          subtitle={`${dashboard?.total_lgas || 18} LGAs monitored`}
        />
        <KPICard
          title="Rainfall (7d)"
          value={`${dashboard?.avg_rainfall_7day?.toFixed(0) || 0}mm`}
          icon="water_drop"
          iconColor="green"
          trend={{ value: 'Above threshold', isPositive: false }}
        />
      </div>

      {/* Main Grid: Map & Satellite Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" style={{ minHeight: '500px' }}>
        {/* Interactive Map */}
        <div className="xl:col-span-9 flex flex-col rounded-xl overflow-hidden border border-[#e6e8eb] bg-white relative">
          {/* Map Header */}
          <div className="p-4 border-b border-[#e6e8eb] flex justify-between items-center bg-white z-10">
            <h3 className="font-bold text-[#111518] text-sm">Geospatial Risk Map</h3>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-red-500"></span> High
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-yellow-400"></span> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-green-500"></span> Low
              </span>
            </div>
          </div>
          {/* Map Container */}
          <div className="flex-1 relative min-h-[400px]">
            <ErrorBoundary>
              <ChoroplethMap />
            </ErrorBoundary>
          </div>
        </div>

        {/* Satellite Feed */}
        <div className="xl:col-span-3 h-full min-h-[400px]">
          <SatelliteFeed />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CaseRainfallChart />
        <FloodingRiskChart />
      </div>
    </div>
  );
}
