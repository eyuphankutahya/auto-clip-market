export type AlertProduct = { stock: number; min_stock: number; stock_alert_enabled: boolean; stock_alert_threshold: number | null };
/** Warning level: custom threshold when set, otherwise the minimum stock. */
export const alertLevel = (p: AlertProduct) => p.stock_alert_threshold ?? p.min_stock;
/** A product warns when alerts are on and stock is zero or below its warning level. */
export const needsAlert = (p: AlertProduct) => p.stock_alert_enabled && (p.stock <= 0 || p.stock < alertLevel(p));
