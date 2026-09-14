import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    text: string;
    trend: 'up' | 'down' | 'neutral' | 'warning';
  };
  icon: LucideIcon;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
}) => {
  return (
    <div className="bg-[#0D1917] border border-[rgba(142,182,155,0.12)] rounded-3xl p-5 shadow-bento-dark relative overflow-hidden group hover:border-[rgba(142,182,155,0.25)] transition-all">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-medium text-[#94A89E] uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl lg:text-3xl font-bold text-[#F3FBF6] tracking-tight font-mono">
            {value}
          </div>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-[#142522] border border-[rgba(142,182,155,0.18)] flex items-center justify-center text-[#10B981] shadow-sm group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || badge) && (
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[rgba(142,182,155,0.08)]">
          {badge && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full font-mono ${
                badge.trend === 'up'
                  ? 'bg-[#163832] text-[#DAF1DE] border border-[rgba(142,182,155,0.2)]'
                  : badge.trend === 'warning'
                  ? 'bg-[#2A1715] text-red-400 border border-red-500/30'
                  : 'bg-[#142522] text-[#8EB69B]'
              }`}
            >
              {badge.text}
            </span>
          )}
          {subtitle && <span className="text-xs text-[#94A89E] truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
