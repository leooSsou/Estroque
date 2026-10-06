import React, { useState, useId, useMemo, useRef } from 'react';
import { TrendingUp, BarChart2 } from 'lucide-react';

export interface ChartDataPoint {
  date: string;
  label: string;
  value: number;
  vendasCount?: number;
}

interface NeonAreaChartProps {
  title?: string;
  subtitle?: string;
  data: ChartDataPoint[];
  color?: string;
  onPeriodChange?: (days: number) => void;
  activePeriod?: number;
  className?: string;
}

export const NeonAreaChart: React.FC<NeonAreaChartProps> = ({
  title = 'Evolução de Vendas & Faturamento',
  subtitle = 'Faturamento diário consolidado das lojas',
  data,
  color = '#00E599',
  onPeriodChange,
  activePeriod = 14,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const filterId = `chart-glow-${uid}`;
  const gradId = `chart-grad-${uid}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(activePeriod);

  const handleSelectPeriod = (days: number) => {
    setSelectedPeriod(days);
    if (onPeriodChange) onPeriodChange(days);
  };

  // Dimensions
  const height = 230;
  const paddingLeft = 16;
  const paddingRight = 16;
  const paddingTop = 32;
  const paddingBottom = 28;

  // Values calculation
  const values = useMemo(() => data.map((d) => d.value), [data]);
  const minVal = useMemo(() => (values.length > 0 ? Math.min(...values) : 0), [values]);
  const maxVal = useMemo(() => (values.length > 0 ? Math.max(...values) : 1), [values]);
  const valRange = maxVal - minVal || 1;

  const totalPeriodo = useMemo(() => values.reduce((acc, curr) => acc + curr, 0), [values]);
  const mediaDiaria = useMemo(() => (values.length > 0 ? totalPeriodo / values.length : 0), [values, totalPeriodo]);

  // Generate coordinates
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

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  const dateRangeDisplay = useMemo(() => {
    if (data.length === 0) return '';
    const firstDate = data[0].date;
    const lastDate = data[data.length - 1].date;
    return `${firstDate} - ${lastDate}`;
  }, [data]);

  return (
    <div
      ref={containerRef}
      className={`bg-[#000000] border border-white/[0.16] rounded-3xl p-5 md:p-6 shadow-bento-dark relative overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Header: Title, Subtitle, and Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            {/* Period Selector Pills */}
            <div className="flex items-center gap-1 bg-[#000000] p-0.5 rounded-lg border border-white/[0.16]">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => handleSelectPeriod(d)}
                  className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all ${
                    selectedPeriod === d
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="p-2 rounded-xl bg-[#000000] border border-white/[0.16] text-emerald-400">
            <BarChart2 className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Main Plot Area */}
      <div className="relative w-full">
        {/* Horizontal gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pt-8 pb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full border-b border-dashed border-white/[0.14]" />
          ))}
        </div>

        {/* Interactive SVG */}
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full h-52 sm:h-60 overflow-visible cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="70%" stopColor={color} stopOpacity="0.04" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

            {/* Area Fill */}
          <path d={areaPath} fill={`url(#${gradId})`} />

          {/* Primary Spline Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="3"
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
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />

              {/* Pulsing Outer Glow Ring */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="8"
                fill={color}
                opacity="0.35"
              />

              {/* Solid Outer Ring */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="4.5"
                fill="#000000"
                stroke={color}
                strokeWidth="2"
              />

              {/* Center Dot */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="2"
                fill="#FFFFFF"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Pill */}
        {activePoint && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-75"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
              transform: 'translate(-50%, -130%)',
            }}
          >
            <div className="bg-[#000000] border border-white/[0.14] px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <div>
                <div className="text-xs font-bold text-white">
                  R$ {activePoint.data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400">
                  {activePoint.data.label} {activePoint.data.vendasCount ? `• ${activePoint.data.vendasCount} vendas` : ''}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer: Real ERP daily average on left, Total & Date range on right */}
      <div className="mt-4 pt-3 border-t border-white/[0.14] flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              MÉDIA DIÁRIA
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              R$ {mediaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dia
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-xs">
            <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              TOTAL
            </span>
            <span className="text-white font-semibold">
              R$ {totalPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="text-slate-400 text-[11px] font-medium">
          {dateRangeDisplay}
        </div>
      </div>
    </div>
  );
};
