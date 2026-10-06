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
  iconColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
}

const colorMap = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  iconColor,
  color,
}) => {
  const activeColor = color || iconColor || 'emerald';
  const isCurrency = typeof value === 'string' && value.trim().startsWith('R$');
  const currencyAmount = isCurrency ? value.trim().replace(/^R\$\s*/, '') : '';

  return (
    <div className="bg-[#000000] border border-white/[0.16] rounded-3xl p-5 shadow-bento-dark relative overflow-hidden group hover:border-white/[0.24] hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1 min-w-0 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block truncate">
            {title}
          </span>

          <div className="pt-2">
            {isCurrency ? (
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-sm font-semibold text-slate-400 select-none">
                  R$
                </span>
                <span className="text-2xl xl:text-3xl font-bold text-white tracking-tight">
                  {currencyAmount}
                </span>
              </div>
            ) : (
              <div className="text-2xl xl:text-3xl font-bold text-white tracking-tight whitespace-nowrap">
                {value}
              </div>
            )}
          </div>
        </div>

        {/* Clean colorful icon capsule */}
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center border flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ${colorMap[activeColor]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || badge) && (
        <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-white/[0.14]">
          {badge ? (
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                badge.trend === 'up'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : badge.trend === 'warning'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : badge.trend === 'down'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-[#000000] text-slate-300 border border-white/[0.14]'
              }`}
            >
              {badge.text}
            </span>
          ) : <span />}

          {subtitle && (
            <span className="text-xs text-slate-400 truncate text-right">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
