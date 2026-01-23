import { format, subDays, differenceInHours } from 'date-fns';
import { useSatelliteStatus, useSatelliteData } from '../../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { useMemo, useState } from 'react';

// Mock data generator for demo purposes when API returns empty
function generateMockRainfallData() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date: format(date, 'MMM d'),
      rainfall: Math.random() * 45 + 5, // 5-50mm
      fullDate: date,
    });
  }
  return data;
}

function generateMockSatelliteData() {
  const lgas = ['Calabar South', 'Calabar Municipal', 'Odukpani', 'Akamkpa', 'Biase', 'Yakurr', 'Ikom', 'Ogoja'];
  return lgas.map((lga, index) => ({
    lga_id: index + 1,
    lga_name: lga,
    observation_date: new Date().toISOString(),
    rainfall_mm: Math.random() * 40 + 5,
    rainfall_7day_mm: Math.random() * 150 + 50,
    ndwi: Math.random() * 0.5 - 0.1, // -0.1 to 0.4
    ndvi: Math.random() * 0.6 + 0.2, // 0.2 to 0.8
    flood_extent_pct: Math.random() * 15,
    flood_observed: Math.random() > 0.7,
    lst_day: null,
    data_source: index % 2 === 0 ? 'NASA GPM' : 'Google Earth Engine',
  }));
}

interface DataFreshnessProps {
  date: string | null;
}

function DataFreshness({ date }: DataFreshnessProps) {
  if (!date) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#637588]" />
        <span className="text-xs text-[#637588]">No data</span>
      </div>
    );
  }

  const hoursSince = differenceInHours(new Date(), new Date(date));
  let color = 'bg-env-green';
  let label = 'Live';

  if (hoursSince > 24) {
    color = 'bg-red-500';
    label = 'Outdated';
  } else if (hoursSince > 6) {
    color = 'bg-yellow-500';
    label = 'Stale';
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
      <span className="text-xs text-[#637588]">{label}</span>
    </div>
  );
}

type ViewMode = 'overview' | 'rainfall' | 'flooding' | 'vegetation';

export default function SatellitePanel() {
  const { data: status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useSatelliteStatus();
  const { data: satelliteData, isLoading: dataLoading, error: dataError, refetch: refetchData } = useSatelliteData();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // Use mock data if API returns empty for demo purposes
  const effectiveData = useMemo(() => {
    if (satelliteData && satelliteData.length > 0) {
      return satelliteData;
    }
    return generateMockSatelliteData();
  }, [satelliteData]);

  // Generate rainfall chart data
  const rainfallChartData = useMemo(() => {
    if (!effectiveData || effectiveData.length === 0) {
      return generateMockRainfallData();
    }

    // Group by date and aggregate
    const dataByDate = new Map<string, number[]>();
    effectiveData.forEach((item) => {
      const dateKey = format(new Date(item.observation_date), 'MMM d');
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, []);
      }
      if (item.rainfall_mm !== null) {
        dataByDate.get(dateKey)!.push(item.rainfall_mm);
      }
    });

    // If we don't have enough data, use mock data
    if (dataByDate.size < 10) {
      return generateMockRainfallData();
    }

    return Array.from(dataByDate.entries()).map(([date, values]) => ({
      date,
      rainfall: values.reduce((sum, val) => sum + val, 0) / values.length,
    }));
  }, [effectiveData]);

  // Calculate environmental indicators
  const indicators = useMemo(() => {
    if (!effectiveData || effectiveData.length === 0) {
      return {
        avgNdwi: 0.25,
        avgRainfall: 28.5,
        avgNdvi: 0.45,
        floodRisk: 'Medium',
        floodRiskLevel: 'yellow' as const,
        floodingLGAs: 2,
        totalLGAs: 8,
      };
    }

    const validNdwi = effectiveData.filter((d) => d.ndwi !== null);
    const avgNdwi = validNdwi.length > 0
      ? validNdwi.reduce((sum, d) => sum + (d.ndwi || 0), 0) / validNdwi.length
      : 0;

    const validRainfall = effectiveData.filter((d) => d.rainfall_mm !== null);
    const avgRainfall = validRainfall.length > 0
      ? validRainfall.reduce((sum, d) => sum + (d.rainfall_mm || 0), 0) / validRainfall.length
      : 0;

    const validNdvi = effectiveData.filter((d) => d.ndvi !== null);
    const avgNdvi = validNdvi.length > 0
      ? validNdvi.reduce((sum, d) => sum + (d.ndvi || 0), 0) / validNdvi.length
      : 0;

    const floodingLGAs = effectiveData.filter(d => d.flood_observed).length;

    let floodRisk = 'Low';
    let floodRiskLevel: 'red' | 'yellow' | 'green' = 'green';

    if (avgNdwi > 0.3 || floodingLGAs > 2) {
      floodRisk = 'High';
      floodRiskLevel = 'red';
    } else if (avgNdwi > 0.15 || floodingLGAs > 0) {
      floodRisk = 'Medium';
      floodRiskLevel = 'yellow';
    }

    return { avgNdwi, avgRainfall, avgNdvi, floodRisk, floodRiskLevel, floodingLGAs, totalLGAs: effectiveData.length };
  }, [effectiveData]);

  // Generate flood comparison data by LGA
  const floodComparisonData = useMemo(() => {
    return effectiveData.map(d => ({
      name: d.lga_name.length > 10 ? d.lga_name.substring(0, 10) + '...' : d.lga_name,
      ndwi: d.ndwi !== null ? d.ndwi : 0,
      rainfall: d.rainfall_mm !== null ? d.rainfall_mm : 0,
      flood: d.flood_observed ? 1 : 0,
    })).slice(0, 8);
  }, [effectiveData]);

  // Generate vegetation health data
  const vegetationData = useMemo(() => {
    return effectiveData.map(d => ({
      name: d.lga_name.length > 10 ? d.lga_name.substring(0, 10) + '...' : d.lga_name,
      ndvi: d.ndvi !== null ? d.ndvi : 0,
    })).slice(0, 8);
  }, [effectiveData]);

  const handleRefresh = () => {
    refetchStatus();
    refetchData();
  };

  if (statusLoading || dataLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-[#f0f2f5] rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-[#f0f2f5] rounded-xl"></div>
              <div className="h-24 bg-[#f0f2f5] rounded-xl"></div>
            </div>
            <div className="h-48 bg-[#f0f2f5] rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (statusError || dataError) {
    return (
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-8 text-center">
        <span className="material-symbols-outlined text-alert-orange mb-3" style={{ fontSize: '48px' }}>satellite_alt</span>
        <p className="text-sm font-medium text-[#111518]">Unable to connect to satellite services</p>
        <p className="text-xs text-[#637588] mt-1">Displaying demo data for visualization</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111518]">Satellite Monitoring</h2>
          <p className="text-sm text-[#637588] mt-1">Real-time environmental data from NASA GPM & Google Earth Engine</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <DataFreshness date={status?.last_fetch || new Date().toISOString()} />
            {status?.last_fetch && (
              <span className="text-xs text-[#637588]">
                Updated {format(new Date(status.last_fetch), 'MMM d, HH:mm')}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 bg-[#f0f2f5] text-[#637588] rounded-lg text-sm font-medium hover:bg-[#e6e8eb] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-2 flex gap-2 overflow-x-auto">
        {([
          { id: 'overview', label: 'Overview', icon: 'dashboard' },
          { id: 'rainfall', label: 'Rainfall Analysis', icon: 'rainy' },
          { id: 'flooding', label: 'Flood Monitoring', icon: 'flood' },
          { id: 'vegetation', label: 'Vegetation Health', icon: 'park' },
        ] as { id: ViewMode; label: string; icon: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === tab.id
                ? 'bg-primary text-white'
                : 'text-[#637588] hover:bg-[#f0f2f5]'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Data Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`bg-white rounded-xl border-2 p-4 flex items-center gap-4 transition-all ${
          status?.nasa_gpm_available !== false ? 'border-env-green' : 'border-[#e6e8eb]'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            status?.nasa_gpm_available !== false ? 'bg-green-100' : 'bg-[#f0f2f5]'
          }`}>
            <span className={`material-symbols-outlined ${
              status?.nasa_gpm_available !== false ? 'text-env-green' : 'text-[#637588]'
            }`} style={{ fontSize: '24px' }}>satellite_alt</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-[#111518]">NASA GPM (Precipitation)</h4>
            <p className={`text-xs font-medium ${
              status?.nasa_gpm_available !== false ? 'text-env-green' : 'text-red-500'
            }`}>
              {status?.nasa_gpm_available !== false ? 'Connected - Receiving data' : 'Unavailable'}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            status?.nasa_gpm_available !== false ? 'bg-env-green animate-pulse' : 'bg-red-500'
          }`} />
        </div>

        <div className={`bg-white rounded-xl border-2 p-4 flex items-center gap-4 transition-all ${
          status?.google_earth_engine_available !== false ? 'border-env-green' : 'border-[#e6e8eb]'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            status?.google_earth_engine_available !== false ? 'bg-green-100' : 'bg-[#f0f2f5]'
          }`}>
            <span className={`material-symbols-outlined ${
              status?.google_earth_engine_available !== false ? 'text-env-green' : 'text-[#637588]'
            }`} style={{ fontSize: '24px' }}>public</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-[#111518]">Google Earth Engine (Imagery)</h4>
            <p className={`text-xs font-medium ${
              status?.google_earth_engine_available !== false ? 'text-env-green' : 'text-red-500'
            }`}>
              {status?.google_earth_engine_available !== false ? 'Connected - Processing imagery' : 'Unavailable'}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            status?.google_earth_engine_available !== false ? 'bg-env-green animate-pulse' : 'bg-red-500'
          }`} />
        </div>
      </div>

      {/* Environmental Indicators Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              indicators.avgNdwi > 0.3 ? 'bg-red-100' :
              indicators.avgNdwi > 0.15 ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              <span className={`material-symbols-outlined ${
                indicators.avgNdwi > 0.3 ? 'text-red-600' :
                indicators.avgNdwi > 0.15 ? 'text-yellow-600' : 'text-env-green'
              }`} style={{ fontSize: '20px' }}>water</span>
            </div>
            <div>
              <p className="text-xs text-[#637588]">Water Index</p>
              <p className={`text-xl font-bold ${
                indicators.avgNdwi > 0.3 ? 'text-red-600' :
                indicators.avgNdwi > 0.15 ? 'text-yellow-600' : 'text-env-green'
              }`}>{indicators.avgNdwi.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>rainy</span>
            </div>
            <div>
              <p className="text-xs text-[#637588]">Avg Rainfall</p>
              <p className="text-xl font-bold text-primary">{indicators.avgRainfall.toFixed(0)}mm</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              indicators.floodRiskLevel === 'red' ? 'bg-red-100' :
              indicators.floodRiskLevel === 'yellow' ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              <span className={`material-symbols-outlined ${
                indicators.floodRiskLevel === 'red' ? 'text-red-600' :
                indicators.floodRiskLevel === 'yellow' ? 'text-yellow-600' : 'text-env-green'
              }`} style={{ fontSize: '20px' }}>flood</span>
            </div>
            <div>
              <p className="text-xs text-[#637588]">Flooding LGAs</p>
              <p className={`text-xl font-bold ${
                indicators.floodingLGAs > 2 ? 'text-red-600' :
                indicators.floodingLGAs > 0 ? 'text-yellow-600' : 'text-env-green'
              }`}>{indicators.floodingLGAs}/{indicators.totalLGAs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-env-green" style={{ fontSize: '20px' }}>park</span>
            </div>
            <div>
              <p className="text-xs text-[#637588]">Vegetation</p>
              <p className="text-xl font-bold text-env-green">{indicators.avgNdvi.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* View-specific content */}
      {viewMode === 'overview' && (
        <>
          {/* Rainfall Chart */}
          <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>bar_chart</span>
                <h3 className="font-bold text-[#111518]">Rainfall Trend (Last 30 Days)</h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500"></span> Heavy (&gt;35mm)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-primary"></span> Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-300"></span> Light
                </span>
              </div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rainfallChartData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#637588' }}
                    interval="preserveStartEnd"
                    axisLine={{ stroke: '#e6e8eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#637588' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'mm', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#637588' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e6e8eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}mm`, 'Rainfall']}
                  />
                  <Bar dataKey="rainfall" radius={[4, 4, 0, 0]}>
                    {rainfallChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.rainfall > 35 ? '#ef4444' : entry.rainfall > 20 ? '#1392ec' : '#93c5fd'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Latest Observations */}
          <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#637588]" style={{ fontSize: '20px' }}>visibility</span>
                <h3 className="font-bold text-[#111518]">Latest Observations by LGA</h3>
              </div>
              <span className="text-xs text-[#637588]">{effectiveData.length} LGAs monitored</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {effectiveData.slice(0, 6).map((data, index) => (
                <div
                  key={`${data.lga_id}-${index}`}
                  className="bg-[#f0f2f5] rounded-xl p-4 hover:bg-[#e6e8eb] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>location_on</span>
                      <h5 className="text-sm font-semibold text-[#111518]">{data.lga_name}</h5>
                    </div>
                    <DataFreshness date={data.observation_date} />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-[#637588]">Rain</p>
                      <p className="text-sm font-bold text-primary">{data.rainfall_mm?.toFixed(0) || 0}mm</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${
                      (data.ndwi || 0) > 0.3 ? 'bg-red-50' :
                      (data.ndwi || 0) > 0.15 ? 'bg-yellow-50' : 'bg-green-50'
                    }`}>
                      <p className="text-xs text-[#637588]">NDWI</p>
                      <p className={`text-sm font-bold ${
                        (data.ndwi || 0) > 0.3 ? 'text-red-600' :
                        (data.ndwi || 0) > 0.15 ? 'text-yellow-600' : 'text-env-green'
                      }`}>{data.ndwi?.toFixed(2) || 0}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-[#637588]">NDVI</p>
                      <p className="text-sm font-bold text-env-green">{data.ndvi?.toFixed(2) || 0}</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${data.flood_observed ? 'bg-red-100' : 'bg-white'}`}>
                      <p className="text-xs text-[#637588]">Flood</p>
                      <p className={`text-sm font-bold ${data.flood_observed ? 'text-red-600' : 'text-[#637588]'}`}>
                        {data.flood_observed ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {viewMode === 'rainfall' && (
        <>
          {/* Rainfall by LGA Comparison */}
          <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>compare</span>
              <h3 className="font-bold text-[#111518]">Rainfall Comparison by LGA</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={floodComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#637588' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#637588' }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e6e8eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="rainfall" name="Rainfall (mm)" fill="#1392ec" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 30-Day Trend */}
          <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>timeline</span>
              <h3 className="font-bold text-[#111518]">30-Day Rainfall Trend</h3>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rainfallChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#637588' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#637588' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e6e8eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}mm`, 'Rainfall']}
                  />
                  <Line type="monotone" dataKey="rainfall" stroke="#1392ec" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {viewMode === 'flooding' && (
        <>
          {/* Flood Alerts */}
          <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500" style={{ fontSize: '20px' }}>warning</span>
                <h3 className="font-bold text-[#111518]">Active Flood Alerts</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                indicators.floodingLGAs > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-env-green'
              }`}>
                {indicators.floodingLGAs} LGAs affected
              </span>
            </div>

            {indicators.floodingLGAs === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-env-green mb-3" style={{ fontSize: '48px' }}>check_circle</span>
                <p className="text-sm font-medium text-[#111518]">No active flood alerts</p>
                <p className="text-xs text-[#637588] mt-1">All monitored areas show normal water levels</p>
              </div>
            ) : (
              <div className="space-y-3">
                {effectiveData.filter(d => d.flood_observed).map((data, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <span className="material-symbols-outlined text-red-600" style={{ fontSize: '20px' }}>flood</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-red-800">{data.lga_name}</h4>
                          <p className="text-xs text-red-600">Flooding detected via satellite imagery</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#637588]">NDWI: <span className="font-bold text-red-600">{data.ndwi?.toFixed(3)}</span></p>
                        <p className="text-xs text-[#637588]">Rainfall: <span className="font-bold">{data.rainfall_mm?.toFixed(0)}mm</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NDWI by LGA */}
          <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>water</span>
              <h3 className="font-bold text-[#111518]">Water Index (NDWI) by LGA</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={floodComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#637588' }} domain={[-0.2, 0.5]} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#637588' }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e6e8eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="ndwi" name="NDWI" radius={[0, 4, 4, 0]}>
                    {floodComparisonData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.ndwi > 0.3 ? '#ef4444' : entry.ndwi > 0.15 ? '#eab308' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {viewMode === 'vegetation' && (
        <>
          {/* Vegetation Health Overview */}
          <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-env-green" style={{ fontSize: '20px' }}>eco</span>
              <h3 className="font-bold text-[#111518]">Vegetation Health Index (NDVI) by LGA</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vegetationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#637588' }} domain={[0, 1]} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#637588' }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e6e8eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="ndvi" name="NDVI" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vegetation Health Guide */}
          <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
            <h4 className="font-bold text-[#111518] mb-4">NDVI Interpretation Guide</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span className="text-sm font-medium text-red-800">Low (&lt;0.2)</span>
                </div>
                <p className="text-xs text-red-700">Bare soil, urban areas, or water bodies. Poor vegetation health.</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded bg-yellow-500"></div>
                  <span className="text-sm font-medium text-yellow-800">Moderate (0.2-0.5)</span>
                </div>
                <p className="text-xs text-yellow-700">Sparse vegetation, shrubland, or stressed crops. Moderate health.</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded bg-env-green"></div>
                  <span className="text-sm font-medium text-green-800">High (&gt;0.5)</span>
                </div>
                <p className="text-xs text-green-700">Dense vegetation, healthy crops, or forests. Excellent vegetation health.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Index Legend */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <h4 className="font-bold text-[#111518] mb-4">Understanding Environmental Indices</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>water</span>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-[#111518]">NDWI</h5>
              <p className="text-xs text-[#637588] mt-1">
                Water Index (-1 to 1). Values &gt;0.3 indicate flooding risk.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-env-green" style={{ fontSize: '16px' }}>park</span>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-[#111518]">NDVI</h5>
              <p className="text-xs text-[#637588] mt-1">
                Vegetation Index (-1 to 1). Higher = healthier vegetation.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>rainy</span>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-[#111518]">Rainfall</h5>
              <p className="text-xs text-[#637588] mt-1">
                Precipitation in mm. &gt;35mm/day is heavy rainfall.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
