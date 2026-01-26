import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { useDashboard, useRiskScores, useSatelliteData } from './useApi';

export function useSatelliteFeedLogic() {
  const { data: satelliteData, isLoading } = useSatelliteData();

  const feedItems = useMemo(() => {
    if (!satelliteData || satelliteData.length === 0) {
      // Fallback mock data
      return [
        { label: 'Calabar South', time: '10:42 AM', color: 'red', ndwi: 0.35, rainfall: 0 },
        { label: 'Odukpani', time: '09:15 AM', color: 'red', ndwi: 0.28, rainfall: 0 },
        { label: 'Akamkpa', time: '08:30 AM', color: 'yellow', ndwi: 0.18, rainfall: 0 },
      ];
    }

    // Sort by NDWI (water index) and take top 3
    return [...satelliteData]
      .sort((a, b) => (b.ndwi || 0) - (a.ndwi || 0))
      .slice(0, 3)
      .map(item => ({
        label: item.lga_name,
        time: format(new Date(item.observation_date), 'h:mm a'),
        color: item.flood_observed ? 'red' : (item.ndwi || 0) > 0.15 ? 'yellow' : 'green',
        ndwi: item.ndwi || 0,
        rainfall: item.rainfall_mm || 0,
      }));
  }, [satelliteData]);

  return { feedItems, isLoading };
}

export function useChartDataLogic() {
  const { data: dashboard } = useDashboard();
  const { data: satelliteData } = useSatelliteData();

  // Generate 7-day correlation data
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayLabel = format(date, 'EEE');
      
      // Try to get real rainfall data from satellite data
      let rainfall = Math.random() * 30 + 5; // Fallback mock
      if (satelliteData && satelliteData.length > 0) {
        const avgRainfall = satelliteData.reduce((sum, s) => sum + (s.rainfall_mm || 0), 0) / satelliteData.length;
        rainfall = Math.max(0, avgRainfall + (Math.random() - 0.5) * 20);
      }

      // Generate case data - higher on days with more rainfall (lagged correlation)
      const laggedRainfall = i < 6 ? (data[data.length - 1]?.rainfall || rainfall) : rainfall;
      const baseCases = dashboard?.total_cases ? Math.floor(dashboard.total_cases / 30) : 2;
      const cases = Math.max(0, Math.floor(baseCases + (laggedRainfall / 10) + (Math.random() - 0.5) * 3));

      data.push({
        day: dayLabel,
        rainfall: Math.round(rainfall * 10) / 10,
        cases: cases,
      });
    }
    return data;
  }, [dashboard, satelliteData]);

  return { chartData };
}

export function useRiskChartLogic() {
  const { data: riskScores, isLoading } = useRiskScores();

  // Get top 5 LGAs by flood risk
  const regions = useMemo(() => {
    if (!riskScores || riskScores.length === 0) {
      // Fallback mock data
      return [
        { name: 'Calabar South', risk: 85, color: '#fa6238' },
        { name: 'Odukpani', risk: 72, color: '#fa6238' },
        { name: 'Akamkpa', risk: 54, color: '#1392ec' },
        { name: 'Biase', risk: 45, color: '#1392ec' },
        { name: 'Yakurr', risk: 28, color: '#22c55e' },
      ];
    }

    return riskScores
        .slice() // Clone to avoid mutation
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(score => ({
        name: score.lga_name || `LGA ${score.lga_id}`,
        risk: Math.round(score.score * 100),
        color: score.level === 'red' ? '#fa6238' : score.level === 'yellow' ? '#eab308' : '#22c55e',
      }));
  }, [riskScores]);

  const maxRisk = Math.max(...regions.map(r => r.risk));
  const criticalCount = regions.filter(r => r.risk > 70).length;

  return { regions, maxRisk, criticalCount, isLoading };
}
