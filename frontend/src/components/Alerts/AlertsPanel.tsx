import { useState } from 'react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { useAlerts } from '../../hooks/useApi';
import { useAppStore } from '../../store/appStore';
import type { Alert, AlertSeverity } from '../../types';

// Safely format date distance, handling invalid dates
function safeFormatDistanceToNow(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'recently';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'recently';
  }
}

const SEVERITY_CONFIG: Record<AlertSeverity, { bg: string; border: string; icon: string; iconBg: string; text: string }> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'warning',
    iconBg: 'bg-red-100 text-red-600',
    text: 'text-red-800',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'error',
    iconBg: 'bg-yellow-100 text-yellow-600',
    text: 'text-yellow-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'info',
    iconBg: 'bg-blue-100 text-blue-600',
    text: 'text-blue-800',
  },
};

interface AlertCardProps {
  alert: Alert;
  onLGAClick?: (lgaId: number) => void;
}

function AlertCard({ alert, onLGAClick }: AlertCardProps) {
  const config = SEVERITY_CONFIG[alert.severity];

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-xl p-4 transition-all hover:shadow-md`}
      role="alert"
      aria-live={alert.severity === 'critical' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{config.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-semibold ${config.text}`}>{alert.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
              alert.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'
            }`}>
              {alert.severity}
            </span>
          </div>
          <p className={`text-sm ${config.text} opacity-80 mt-1`}>{alert.message}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-[#637588]">
              {safeFormatDistanceToNow(alert.created_at)}
            </span>
            {alert.lga_name && (
              <span className="text-xs text-[#637588] flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_on</span>
                {alert.lga_name}
              </span>
            )}
            {alert.lga_id && onLGAClick && (
              <button
                onClick={() => onLGAClick(alert.lga_id!)}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                aria-label={`View ${alert.lga_name} on map`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>map</span>
                View on map
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type FilterType = 'all' | AlertSeverity;

export default function AlertsPanel() {
  const { data: alerts, isLoading, error, refetch } = useAlerts();
  const { setSelectedLGAId } = useAppStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts?.filter(a => a.severity === filter);

  const criticalCount = alerts?.filter((a) => a.severity === 'critical').length || 0;
  const warningCount = alerts?.filter((a) => a.severity === 'warning').length || 0;
  const infoCount = alerts?.filter((a) => a.severity === 'info').length || 0;

  const handleLGAClick = (lgaId: number) => {
    setSelectedLGAId(lgaId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-[#f0f2f5] rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-[#f0f2f5] rounded-xl"></div>
              <div className="h-20 bg-[#f0f2f5] rounded-xl"></div>
              <div className="h-20 bg-[#f0f2f5] rounded-xl"></div>
            </div>
            <div className="h-24 bg-[#f0f2f5] rounded-xl"></div>
            <div className="h-24 bg-[#f0f2f5] rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-8 text-center">
        <span className="material-symbols-outlined text-red-400 mb-3" style={{ fontSize: '48px' }}>error</span>
        <p className="text-sm font-medium text-red-600">Failed to load alerts</p>
        <button
          onClick={() => refetch()}
          className="mt-3 text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 mx-auto"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111518]">Alerts & Notifications</h2>
          <p className="text-sm text-[#637588] mt-1">Monitor risk alerts and outbreak notifications</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 bg-[#f0f2f5] text-[#637588] rounded-lg text-sm font-medium hover:bg-[#e6e8eb] transition-colors"
          aria-label="Refresh alerts"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600" style={{ fontSize: '24px' }}>warning</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            <p className="text-sm text-[#637588]">Critical Alerts</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-yellow-600" style={{ fontSize: '24px' }}>error</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
            <p className="text-sm text-[#637588]">Warnings</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e6e8eb] p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600" style={{ fontSize: '24px' }}>info</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{infoCount}</p>
            <p className="text-sm text-[#637588]">Informational</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-2 flex gap-2 overflow-x-auto">
        {(['all', 'critical', 'warning', 'info'] as FilterType[]).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === type
                ? 'bg-primary text-white'
                : 'text-[#637588] hover:bg-[#f0f2f5]'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {type === 'all' ? 'notifications' : SEVERITY_CONFIG[type as AlertSeverity].icon}
            </span>
            {type === 'all' ? 'All Alerts' : type.charAt(0).toUpperCase() + type.slice(1)}
            {type !== 'all' && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                filter === type ? 'bg-white/20' : 'bg-[#e6e8eb]'
              }`}>
                {type === 'critical' ? criticalCount : type === 'warning' ? warningCount : infoCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#111518]">
            {filter === 'all' ? 'All Alerts' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Alerts`}
          </h3>
          <span className="text-sm text-[#637588]">{filteredAlerts?.length || 0} total</span>
        </div>

        {!filteredAlerts || filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[#637588] mb-3" style={{ fontSize: '48px' }}>
              check_circle
            </span>
            <p className="text-sm font-medium text-[#111518]">No active alerts</p>
            <p className="text-xs text-[#637588] mt-1">All areas are within normal risk levels</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onLGAClick={handleLGAClick} />
            ))}
          </div>
        )}
      </div>

      {/* Alert Settings Card */}
      <div className="bg-white rounded-xl border border-[#e6e8eb] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#f0f2f5] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#637588]" style={{ fontSize: '20px' }}>settings</span>
          </div>
          <div>
            <h3 className="font-bold text-[#111518]">Alert Settings</h3>
            <p className="text-sm text-[#637588]">Configure notification thresholds</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#f0f2f5] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#111518]">High Risk Threshold</span>
              <span className="text-sm font-bold text-red-600">0.7</span>
            </div>
            <p className="text-xs text-[#637588]">Alert when risk score exceeds this value</p>
          </div>
          <div className="bg-[#f0f2f5] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#111518]">Medium Risk Threshold</span>
              <span className="text-sm font-bold text-yellow-600">0.4</span>
            </div>
            <p className="text-xs text-[#637588]">Warning when risk score exceeds this value</p>
          </div>
        </div>
      </div>
    </div>
  );
}
