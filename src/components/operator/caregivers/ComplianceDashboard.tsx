"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiAlertCircle, FiCheckCircle, FiUsers, FiFileText } from 'react-icons/fi';
import { getCertificationStatus } from './CertificationStatusBadge';

type ComplianceStats = {
  totalCaregivers: number;
  currentCertifications: number;
  expiringSoon: number;
  expired: number;
  caregiversWithExpired: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
    certifications: {
      id: string;
      type: string;
      expiryDate: Date | string | null;
    }[];
  }[];
};

export function ComplianceDashboard() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompliance();
  }, []);

  const fetchCompliance = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/operator/caregivers/compliance');
      if (!res.ok) throw new Error('Failed to fetch compliance data');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching compliance:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-1">Compliance Dashboard</h2>
        <p className="text-neutral-600">Overview of caregiver certification compliance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-neutral-900">{stats.totalCaregivers}</p>
              <p className="text-sm text-neutral-600 mt-1">Total Caregivers</p>
            </div>
            <FiUsers className="w-8 h-8 text-neutral-400" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-900">{stats.currentCertifications}</p>
              <p className="text-sm text-green-700 mt-1">Current Certifications</p>
            </div>
            <FiCheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-yellow-900">{stats.expiringSoon}</p>
              <p className="text-sm text-yellow-700 mt-1">Expiring Soon</p>
            </div>
            <FiAlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-red-900">{stats.expired}</p>
              <p className="text-sm text-red-700 mt-1">Expired</p>
            </div>
            <FiAlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Caregivers with Expired Certifications */}
      {stats.caregiversWithExpired.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900">
              Caregivers with Expiring or Expired Certifications
            </h3>
            <span className="text-sm text-neutral-600">
              {stats.caregiversWithExpired.length} caregiver(s)
            </span>
          </div>
          <div className="space-y-3">
            {stats.caregiversWithExpired.map((caregiver) => (
              <Link
                key={caregiver.id}
                href={`/operator/caregivers/${caregiver.id}?tab=certifications`}
                className="block p-4 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-neutral-900">
                      {caregiver.user.firstName} {caregiver.user.lastName}
                    </h4>
                    <div className="mt-2 space-y-1">
                      {caregiver.certifications.map((cert) => {
                        const status = getCertificationStatus(cert.expiryDate);
                        if (status === 'EXPIRED' || status === 'EXPIRING_SOON') {
                          return (
                            <div key={cert.id} className="flex items-center gap-2 text-sm">
                              <FiFileText className="w-4 h-4 text-neutral-400" />
                              <span className="text-neutral-700">{cert.type}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  status === 'EXPIRED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {status === 'EXPIRED' ? 'Expired' : 'Expiring Soon'}
                              </span>
                              {cert.expiryDate && (
                                <span className="text-xs text-neutral-500">
                                  {new Date(cert.expiryDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                  <span className="text-primary-600 text-sm font-medium">View →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
