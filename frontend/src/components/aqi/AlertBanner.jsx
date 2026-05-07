import { AlertTriangle, Info, Zap, X } from "lucide-react";

const icons = {
  info: Info,
  warning: AlertTriangle,
  critical: Zap,
};

const styles = {
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-300",
  critical: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300",
};

export default function AlertBanner({ alert, onDismiss }) {
  const Icon = icons[alert.severity] || Info;
  const style = styles[alert.severity] || styles.info;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${style}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.station}</p>
        <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}