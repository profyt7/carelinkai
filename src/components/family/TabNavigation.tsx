'use client';

import React from 'react';
import { FiFileText, FiActivity, FiDollarSign, FiAlertCircle, FiUsers } from 'react-icons/fi';
import { MessageSquare, Edit3, Camera } from 'lucide-react';

type TabKey = 'documents' | 'timeline' | 'messages' | 'billing' | 'emergency' | 'notes' | 'gallery' | 'members';

interface TabNavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  unreadCount?: number;
}

export default function TabNavigation({ activeTab, onTabChange, unreadCount = 0 }: TabNavigationProps) {
  const tabs = [
    { id: 'documents' as TabKey, label: 'Documents', icon: FiFileText, count: 0 },
    { id: 'timeline' as TabKey, label: 'Activity', icon: FiActivity, count: 0 },
    { id: 'gallery' as TabKey, label: 'Gallery', icon: Camera, count: 0 },
    { id: 'notes' as TabKey, label: 'Notes', icon: Edit3, count: 0 },
    { id: 'messages' as TabKey, label: 'Messages', icon: MessageSquare, count: unreadCount },
    { id: 'members' as TabKey, label: 'Members', icon: FiUsers, count: 0 },
    { id: 'billing' as TabKey, label: 'Billing', icon: FiDollarSign, count: 0 },
    { id: 'emergency' as TabKey, label: 'Emergency', icon: FiAlertCircle, count: 0 },
  ];

  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-bold
                  ${isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
