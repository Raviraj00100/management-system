import React from 'react';
import { ApplicationStatus } from '../types';
import { CheckCircle2, Clock, XCircle, AlertCircle, ArrowLeftCircle, LogOut, Check, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Draft',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: Clock,
        };
      case 'PENDING_CLASS_ADVISOR':
        return {
          label: 'Pending Advisor',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: Clock,
        };
      case 'PENDING_HOD':
        return {
          label: 'Pending HOD',
          bg: 'bg-sky-50 text-sky-800 border-sky-300',
          icon: Clock,
        };
      case 'PENDING_WARDEN':
        return {
          label: 'Pending Warden',
          bg: 'bg-purple-50 text-purple-800 border-purple-300',
          icon: Clock,
        };
      case 'APPROVED':
        return {
          label: 'Approved',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: CheckCircle2,
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: XCircle,
        };
      case 'RETURNED_FOR_CORRECTION':
        return {
          label: 'Correction Required',
          bg: 'bg-orange-50 text-orange-800 border-orange-300',
          icon: ArrowLeftCircle,
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          bg: 'bg-gray-100 text-gray-600 border-gray-300',
          icon: AlertCircle,
        };
      case 'OUTPASS_ISSUED':
        return {
          label: 'Gate Pass Issued',
          bg: 'bg-blue-50 text-blue-800 border-blue-300',
          icon: LogOut,
        };
      case 'RETURNED_TO_HOSTEL':
        return {
          label: 'Returned to Hostel',
          bg: 'bg-teal-50 text-teal-800 border-teal-300',
          icon: Check,
        };
      case 'OVERDUE_RETURN':
        return {
          label: 'Overdue Return',
          bg: 'bg-red-100 text-red-900 border-red-400 font-semibold animate-pulse',
          icon: AlertTriangle,
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: Clock,
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm ${config.bg} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
};
