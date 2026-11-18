import { date, istanbulDayStart, shiftCalendarDay, STATUS } from "./format";
import type { OrderDetails } from "@/components/site/OrderDialog";

export function orderDateBounds(from: string, to: string) {
  return {
    from: from ? istanbulDayStart(from) : undefined,
    to: to ? istanbulDayStart(shiftCalendarDay(to, 1)) : undefined,
  };
}

export function matchesCustomer(value: string | null | undefined, search: string) {
  return (value ?? "").toLocaleLowerCase("tr-TR").includes(search.trim().toLocaleLowerCase("tr-TR"));
}

export const orderListHeader = ["Sipariş No", "Tarih", "Müşteri", "E-posta", "Durum", "İskonto (%)", "Toplam Adet", "Toplam (TL)", "Not"];
export function orderListRow(order: OrderDetails, customer: string, email: string) {
  return [order.order_no, date(order.created_at), customer, email, STATUS[order.status] ?? order.status,
    Number(order.discount_rate), order.items.reduce((total, item) => total + item.quantity, 0), Number(order.total), order.notes];
}

export const orderDetailHeader = ["Sipariş No", "Tarih", "Durum", "İskonto (%)", "KM No", "Ürün", "Adet", "Birim Fiyat (TL)", "Satır Tutarı (TL)", "Sipariş Toplamı (TL)", "Not"];
export function orderDetailRows(order: OrderDetails) {
  return order.items.map(item => [order.order_no, date(order.created_at), STATUS[order.status] ?? order.status,
    Number(order.discount_rate), item.product?.sku ?? "", item.product_name, item.quantity,
    Number(item.unit_price), item.quantity * Number(item.unit_price), Number(order.total), order.notes]);
}
