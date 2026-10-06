import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Sparkline } from '../charts/Sparkline';

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
  sparklineData?: number[];
  sparklineColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  sparklineData,
  sparklineColor,
}) => {
  const isCurrency = typeof value === 'string' && value.trim().startsWith('R$');
  const currencyAmount = isCurrency ? value.trim().replace(/^R\$\s*/, '') : '';

  // Determine neon color for sparkline and accents
  const resolvedSparkColor =
    sparklineColor ||
    (badge?.trend === 'warning'
      ? '#FF9F43'
      : badge?.trend === 'down'
      ? '#F87171'
      : '#00E599');

  return (
    <div className="bg-[#141518] border border-white/[0.07] rounded-3xl p-5 shadow-bento-dark relative overflow-hidden group hover:border-white/[0.16] hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1 min-w-0 space-y-1">
          <span className="text-xs font-semibold text-[#8A8F98] tracking-wide block truncate">
            {title}
          </span>
          {subtitle && (
            <p className="text-[11px] text-[#62666D] truncate">{subtitle}</p>
          )}

          <div className="pt-2">
            {isCurrency ? (
              <div className="flex items-baseline gap-1 whitespace-nowrap">
                <span className="text-sm font-semibold text-[#8A8F98] font-mono select-none">
                  R$
                </span>
                <span className="text-2xl xl:text-3xl font-extrabold text-[#FFFFFF] font-mono tracking-tight">
                  {currencyAmount}
                </span>
              </div>
            ) : (
              <div className="text-2xl xl:text-3xl font-extrabold text-[#FFFFFF] font-mono tracking-tight whitespace-nowrap">
                {value}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Sparkline curve if provided, or icon pill */}
        {sparklineData && sparklineData.length >= 2 ? (
          <div className="flex flex-col items-end justify-center self-center flex-shrink-0">
            <Sparkline
              data={sparklineData}
              color={resolvedSparkColor}
              width={100}
              height={44}
            />
          </div>
        ) : (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#1D1E22] border border-white/[0.08] flex items-center justify-center text-[#00E599] shadow-sm flex-shrink-0 group-hover:scale-105 transition-all duration-300">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {badge && (
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/[0.06]">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
              badge.trend === 'up'
                ? 'bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/25'
                : badge.trend === 'warning'
                ? 'bg-[#FF9F43]/10 text-[#FF9F43] border border-[#FF9F43]/25'
                : badge.trend === 'down'
                ? 'bg-red-500/10 text-red-400 border border-red-500/25'
                : 'bg-[#1D1E22] text-[#8A8F98] border border-white/[0.06]'
            }`}
          >
            {badge.text}
          </span>
          <span className="text-[11px] text-[#62666D]">vs. período anterior</span>
        </div>
      )}
    </div>
  );
};
