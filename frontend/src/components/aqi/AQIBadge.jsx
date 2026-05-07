import { getAQIBg } from "@/utils/aqi";

export default function AQIBadge({ category, size = "sm" }) {
  const classes = getAQIBg(category);
  const sizeClass = size === "sm" ? "text-xs px-2.5 py-0.5" : "text-sm px-3 py-1";
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${classes} ${sizeClass}`}>
      {category}
    </span>
  );
}