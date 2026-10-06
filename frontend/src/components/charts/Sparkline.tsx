import React, { useId } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#00E599',
  width = 110,
  height = 42,
  strokeWidth = 2.5,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const filterId = `spark-glow-${uid}`;
  const gradId = `spark-grad-${uid}`;

  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const paddingY = 6;
  const paddingX = 4;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  // Normalized coordinate points
  const points = data.map((val, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * usableWidth;
    const y = height - paddingY - ((val - min) / range) * usableHeight;
    return { x, y };
  });

  // Generate smooth cubic Bezier path
  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      // Tension factor 0.2
      const cp1x = p1.x + (p2.x - p0.x) * 0.2;
      const cp1y = p1.y + (p2.y - p0.y) * 0.2;
      const cp2x = p2.x - (p3.x - p1.x) * 0.2;
      const cp2y = p2.y - (p3.y - p1.y) * 0.2;

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  };

  const linePath = generateSmoothPath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${height} L ${firstPoint.x.toFixed(2)} ${height} Z`;

  return (
    <div className={`relative flex items-center justify-end select-none pointer-events-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area Under Curve */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Primary Glowing Curve */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />

        {/* Highlight Endpoint with Pulse Halo */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3"
          fill={color}
          className="shadow-sm"
        />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="6"
          fill={color}
          opacity="0.25"
        />
      </svg>
    </div>
  );
};
