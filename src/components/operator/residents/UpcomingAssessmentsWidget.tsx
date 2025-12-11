'use client';

import { FiCalendar, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { format } from 'date-fns';

interface Assessment {
  id: string;
  type: string;
  dueDate: Date | string;
  status: string;
}

interface UpcomingAssessmentsWidgetProps {
  assessments: Assessment[];
}

export function UpcomingAssessmentsWidget({ assessments }: UpcomingAssessmentsWidgetProps) {
  const now = new Date();
  
  const upcomingAssessments = assessments
    .filter(a => a.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const getUrgency = (dueDate: Date | string): 'overdue' | 'urgent' | 'soon' | 'upcoming' => {
    const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 7) return 'urgent';
    if (daysUntilDue <= 14) return 'soon';
    return 'upcoming';
  };

  const urgencyConfig = {
    overdue: { color: 'text-red-600', bg: 'bg-red-50', icon: <FiAlertCircle className="w-4 h-4" /> },
    urgent: { color: 'text-orange-600', bg: 'bg-orange-50', icon: <FiAlertCircle className="w-4 h-4" /> },
    soon: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: <FiCalendar className="w-4 h-4" /> },
    upcoming: { color: 'text-blue-600', bg: 'bg-blue-50', icon: <FiCalendar className="w-4 h-4" /> },
  };

  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  if (upcomingAssessments.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiCheckCircle className="w-5 h-5 text-green-500" />
          Upcoming Assessments
        </h3>
        <p className="text-gray-600 text-sm">All assessments are up to date!</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Upcoming Assessments</h3>
      <div className="space-y-3">
        {upcomingAssessments.map((assessment) => {
          const urgency = getUrgency(assessment.dueDate);
          const config = urgencyConfig[urgency];
          
          return (
            <div key={assessment.id} className={`p-3 rounded-lg ${config.bg} flex items-start gap-3`}>
              <div className={config.color}>{config.icon}</div>
              <div className="flex-1">
                <div className="font-medium text-sm">{assessment.type.replace(/_/g, ' ')}</div>
                <div className={`text-xs ${config.color} mt-1`}>
                  Due: {formatDate(assessment.dueDate)}
                  {urgency === 'overdue' && ' (Overdue)'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
