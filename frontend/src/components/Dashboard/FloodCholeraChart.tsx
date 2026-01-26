import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useWeeklySummary } from '../../hooks/useApi';

export default function FloodCholeraChart() {
  const { data, isLoading } = useWeeklySummary(12);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-white rounded-xl border border-[#e6e8eb]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data?.weekly_data || data.weekly_data.length === 0) {
    return (
        <div className="flex items-center justify-center h-[300px] bg-white rounded-xl border border-[#e6e8eb]">
            <p className="text-gray-400 text-sm">No data available for chart</p>
        </div>
    )
  }

  // Format dates for display
  const chartData = data.weekly_data.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.week), 'MMM d'),
  }));

  return (
    <div className="bg-white rounded-xl border border-[#e6e8eb] p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-base font-bold text-[#111518]">Flood & Cholera Correlation</h3>
          <p className="text-[#637588] text-sm mt-1">Comparing flood extent with new cases over time</p>
        </div>
      </div>

      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid stroke="#f5f5f5" vertical={false} />
            <XAxis
                dataKey="formattedDate"
                scale="point"
                padding={{ left: 10, right: 10 }}
                tick={{ fontSize: 12, fill: '#637588' }}
                axisLine={false}
                tickLine={false}
            />
            {/* Left Y-Axis for Cases (Bar) */}
            <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 12, fill: '#637588' }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'New Cases', angle: -90, position: 'insideLeft', style: { fill: '#637588', fontSize: 12 } }}
            />
            {/* Right Y-Axis for Flood Extent (Line) */}
            <YAxis
                yAxisId="right"
                orientation="right"
                unit="%"
                tick={{ fontSize: 12, fill: '#637588' }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Flood Extent', angle: 90, position: 'insideRight', style: { fill: '#637588', fontSize: 12 } }}
            />
            <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Legend />

            <Bar yAxisId="left" dataKey="cases" name="Cases" barSize={20} fill="#fa6238" radius={[4, 4, 0, 0]} />
            <Line
                yAxisId="right"
                type="monotone"
                dataKey="flood_extent"
                name="Flood Extent %"
                stroke="#1392ec"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
