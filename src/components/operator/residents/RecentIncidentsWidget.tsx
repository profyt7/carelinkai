'use client';

import { FiAlertTriangle, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { format } from 'date-fns';

interface Incident {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  date: Date | string;
  description?: string;
}

interface RecentIncidentsWidgetProps {
  incidents: Incident[];
}

export function RecentIncidentsWidget({ incidents }: RecentIncidentsWidgetProps) {
  const recentIncidents = incidents
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const severityConfig: Record<string, { color: string; bg: string; icon: JSX.Element }> = {
    HIGH: { color: 'text-red-600', bg: 'bg-red-50', icon: <FiAlertTriangle className="w-4 h-4" /> },
    MEDIUM: { color: 'text-orange-600', bg: 'bg-orange-50', icon: <FiAlertCircle className="w-4 h-4" /> },
    LOW: { color: 'text-blue-600', bg: 'bg-blue-50', icon: <FiInfo className="w-4 h-4" /> },
  };
  
  // Default config for unknown/undefined severity
  const defaultConfig = { color: 'text-gray-600', bg: 'bg-gray-50', icon: <FiInfo className="w-4 h-4" /> };

  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  if (recentIncidents.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Recent Incidents</h3>
        <p className="text-gray-600 text-sm">No incidents reported</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Recent Incidents</h3>
      <div className="space-y-3">
        {recentIncidents.map((incident) => {
          // Use default config if severity is undefined or not recognized
          const config = (incident.severity && severityConfig[incident.severity]) || defaultConfig;
          const severityLabel = incident.severity || 'UNKNOWN';
          
          return (
            <div key={incident.id} className={`p-3 rounded-lg ${config.bg} flex items-start gap-3`}>
              <div className={config.color}>{config.icon}</div>
              <div className="flex-1">
                <div className="font-medium text-sm">{incident.type?.replace(/_/g, ' ') || 'Unknown'}</div>
                <div className="text-xs text-gray-600 mt-1">{formatDate(incident.date)}</div>
                {incident.description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{incident.description}</div>
                )}
              </div>
              <div className={`text-xs font-medium ${config.color}`}>
                {severityLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
