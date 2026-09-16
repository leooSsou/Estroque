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
  const isCurrency = typeof value === 'string' && value.trim().startsWith('R$');
  const currencyAmount = isCurrency ? value.trim().replace(/^R\$\s*/, '') : '';

  return (
    <div className="bg-[#0D1917] border border-[rgba(142,182,155,0.12)] rounded-3xl p-5 shadow-bento-dark relative overflow-hidden group hover:border-[#10B981]/40 hover:-translate-y-1 hover:shadow-glow-emerald transition-all duration-300">
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#10B981]/5 rounded-full blur-2xl group-hover:bg-[#10B981]/15 transition-all duration-500 pointer-events-none" />
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1 min-w-0 space-y-1.5">
          <span className="text-xs font-semibold text-[#94A89E] uppercase tracking-wider block truncate">
            {title}
          </span>
          {isCurrency ? (
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-xs sm:text-sm font-semibold text-[#8EB69B] font-mono select-none">
                R$
              </span>
              <span className="text-xl sm:text-2xl xl:text-[26px] font-extrabold text-[#F3FBF6] font-mono tracking-tight">
                {currencyAmount}
              </span>
            </div>
          ) : (
            <div className="text-xl sm:text-2xl xl:text-[26px] font-extrabold text-[#F3FBF6] font-mono tracking-tight whitespace-nowrap">
              {value}
            </div>
          )}
        </div>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#142522] border border-[rgba(142,182,155,0.18)] flex items-center justify-center text-[#10B981] shadow-sm flex-shrink-0 group-hover:scale-110 group-hover:bg-[#10B981]/10 group-hover:border-[#10B981]/40 transition-all duration-300">
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
