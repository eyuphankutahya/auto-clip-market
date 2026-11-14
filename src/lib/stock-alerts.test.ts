import { describe, expect, it } from "vitest";
import { needsAlert } from "./stock-alerts";
const base = { stock: 40, min_stock: 50, stock_alert_enabled: true, stock_alert_threshold: null };
describe("stock alerts", () => {
  it("uses min stock when no custom threshold", () => expect(needsAlert(base)).toBe(true));
  it("custom threshold overrides min stock", () => expect(needsAlert({ ...base, stock_alert_threshold: 30 })).toBe(false));
  it("disabled products never warn", () => expect(needsAlert({ ...base, stock: 0, stock_alert_enabled: false })).toBe(false));
  it("zero stock warns even with threshold 0", () => expect(needsAlert({ ...base, stock: 0, stock_alert_threshold: 0 })).toBe(true));
  it("warns strictly below the configured threshold, not at it", () => {
    expect(needsAlert({ ...base, stock: 49, stock_alert_threshold: 50 })).toBe(true);
    expect(needsAlert({ ...base, stock: 50, stock_alert_threshold: 50 })).toBe(false);
    expect(needsAlert({ ...base, stock: 51, stock_alert_threshold: 50 })).toBe(false);
  });
});
