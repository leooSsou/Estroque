import React, { useState, useId, useMemo, useRef } from 'react';
import { Plus, TrendingUp } from 'lucide-react';

export interface ChartDataPoint {
  date: string;
  label: string;
  value: number;
}

interface NeonAreaChartProps {
  title?: string;
  subtitle?: string;
  data: ChartDataPoint[];
  color?: string;
  avgGrowth?: string;
  onPeriodChange?: (days: number) => void;
  activePeriod?: number;
  className?: string;
}

export const NeonAreaChart: React.FC<NeonAreaChartProps> = ({
  title = 'Fluxo de Vendas & Receita',
  subtitle = 'Histórico consolidado em tempo real',
  data,
  color = '#00E599',
  avgGrowth = '+14.2%',
  onPeriodChange,
  activePeriod = 14,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const filterId = `neon-area-glow-${uid}`;
  const gradId = `neon-area-grad-${uid}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Periods: 7, 14, 30 days
  const [selectedPeriod, setSelectedPeriod] = useState<number>(activePeriod);

  const handleSelectPeriod = (days: number) => {
    setSelectedPeriod(days);
    if (onPeriodChange) onPeriodChange(days);
  };

  // Dimensions
  const height = 240;
  const paddingLeft = 16;
  const paddingRight = 16;
  const paddingTop = 36;
  const paddingBottom = 28;

  // Values calculation
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  // Generate coordinates (normalized to 1000 width for responsive viewBox)
  const svgWidth = 1000;
  const usableWidth = svgWidth - paddingLeft - paddingRight;
  const usableHeight = height - paddingTop - paddingBottom;

  const points = useMemo(() => {
    if (data.length === 0) return [];
    return data.map((d, i) => {
      const x = paddingLeft + (i / Math.max(1, data.length - 1)) * usableWidth;
      const y = height - paddingBottom - ((d.value - minVal) / valRange) * usableHeight;
      return { x, y, data: d };
    });
  }, [data, minVal, valRange, usableWidth, usableHeight, paddingLeft, paddingBottom, height]);

  // Generate smooth cubic Bezier spline
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) * 0.22;
      const cp1y = p1.y + (p2.y - p0.y) * 0.22;
      const cp2x = p2.x - (p3.x - p1.x) * 0.22;
      const cp2y = p2.y - (p3.y - p1.y) * 0.22;

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }, [points]);

  // Area under curve
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x.toFixed(2)} ${height - paddingBottom} L ${first.x.toFixed(2)} ${height - paddingBottom} Z`;
  }, [linePath, points, height, paddingBottom]);

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relativeX = (clientX / rect.width) * svgWidth;

    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - relativeX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Active point
  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  // Date range display
  const dateRangeDisplay = useMemo(() => {
    if (data.length === 0) return '';
    const firstDate = data[0].date;
    const lastDate = data[data.length - 1].date;
    return `${firstDate} - ${lastDate}`;
  }, [data]);

  return (
    <div
      ref={containerRef}
      className={`bg-[#141518] border border-white/[0.07] rounded-3xl p-5 md:p-6 shadow-bento-dark relative overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Header matching the reference: Title, subtitle with pill period & action plus */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            {/* Period Selector Pills */}
            <div className="flex items-center gap-1 bg-[#1A1B1F] p-0.5 rounded-lg border border-white/[0.06]">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => handleSelectPeriod(d)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-all ${
                    selectedPeriod === d
                      ? 'bg-white/[0.12] text-white shadow-sm'
                      : 'text-[#8A8F98] hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#8A8F98] mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            className="w-8 h-8 rounded-xl bg-[#1A1B1F] hover:bg-[#22242A] border border-white/[0.08] flex items-center justify-center text-[#8A8F98] hover:text-white transition-all active:scale-95"
            title="Expandir métricas"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Plot Area */}
      <div className="relative w-full">
        {/* Horizontal gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pt-9 pb-7">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full border-b border-dashed border-white/[0.05]" />
          ))}
        </div>

        {/* Interactive SVG */}
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full h-56 sm:h-64 overflow-visible cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Neon Glow Filter with Gaussian Blur */}
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient Fill under Curve */}
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="60%" stopColor={color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#${gradId})`} />

          {/* Primary Spline Neon Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${filterId})`}
          />

          {/* Hover Interactive Indicator */}
          {activePoint && (
            <g>
              {/* Vertical Dashed Guide Line */}
              <line
                x1={activePoint.x}
                y1={paddingTop - 10}
                x2={activePoint.x}
                y2={height - paddingBottom}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />

              {/* Pulsing Outer Glow Ring */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="10"
                fill={color}
                opacity="0.35"
                className="animate-pulse"
              />

              {/* Solid Outer Ring */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5"
                fill="#141518"
                stroke={color}
                strokeWidth="2.5"
              />

              {/* Center Dot */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="2.5"
                fill="#FFFFFF"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Pill (Positioned absolutely over active point) */}
        {activePoint && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-75"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
              transform: 'translate(-50%, -130%)',
            }}
          >
            <div className="bg-[#1C1D22] border border-white/[0.12] px-2.5 py-1 rounded-lg shadow-xl flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-mono text-xs font-extrabold text-white">
                R$ {activePoint.data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-[#8A8F98] font-mono">
                • {activePoint.data.label}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer matching reference: AVG metrics on left, Date range on right */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-[#8A8F98] uppercase text-[10px] font-bold tracking-wider">
            AVG
          </span>
          <span className="text-[#00E599] font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {avgGrowth}
          </span>
        </div>

        <div className="text-[#8A8F98] text-[11px] font-medium">
          {dateRangeDisplay}
        </div>
      </div>
    </div>
  );
};
