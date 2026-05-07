import { getAQIColor, getAQICategory, getAQIDescription } from "@/utils/aqi";

export default function AQIGauge({ aqi, size = "lg" }) {
  const category = getAQICategory(aqi);
  const color = getAQIColor(category);
  const description = getAQIDescription(category);

  // Arc parameters
  const r = size === "lg" ? 80 : 55;
  const cx = size === "lg" ? 100 : 70;
  const cy = size === "lg" ? 100 : 70;
  const strokeWidth = size === "lg" ? 14 : 10;
  const svgSize = size === "lg" ? 200 : 140;

  const circumference = Math.PI * r; // half circle
  const maxAQI = 500;
  const progress = Math.min(aqi / maxAQI, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: svgSize, height: svgSize / 2 + (size === "lg" ? 20 : 14) }}>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
          />
          {/* Center text */}
          <text x={cx} y={cy - (size === "lg" ? 10 : 6)} textAnchor="middle" className="font-grotesk" fill={color} fontSize={size === "lg" ? 32 : 22} fontWeight="700">
            {aqi}
          </text>
          <text x={cx} y={cy + (size === "lg" ? 10 : 8)} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={size === "lg" ? 12 : 9}>
            AQI
          </text>
        </svg>
      </div>
      <div className="text-center mt-1">
        <p className="font-grotesk font-semibold text-sm" style={{ color }}>{category}</p>
        {size === "lg" && (
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] text-center">{description}</p>
        )}
      </div>
    </div>
  );
}