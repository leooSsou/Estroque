import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'mint' | 'emerald' | 'sage' | 'danger' | 'warning' | 'neutral' | 'blue' | 'purple' | 'amber' | 'rose';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles = {
    mint: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    sage: 'bg-[#000000] text-slate-300 border border-white/[0.14]',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    neutral: 'bg-[#000000] text-slate-300 border border-white/[0.14]',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-tight whitespace-nowrap ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
