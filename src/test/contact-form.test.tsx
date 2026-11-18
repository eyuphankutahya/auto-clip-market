import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ContactForm } from "@/components/site/ContactForm";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => send }));
vi.mock("@/lib/contact.functions", () => ({ submitContact: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }));

it("suggests a subject and message details without replacing a custom subject", () => {
  render(<ContactForm />);
  const subject = screen.getByLabelText("Konu");
  const message = screen.getByLabelText("Mesaj");
  fireEvent.click(screen.getByRole("radio", { name: "Ürün ve uyumluluk" }));
  expect(subject).toHaveValue("Ürün ve uyumluluk sorusu");
  expect(message).toHaveAccessibleDescription(/KM No veya OEM/);

  fireEvent.click(screen.getByRole("radio", { name: "Sipariş ve teslimat" }));
  expect(subject).toHaveValue("Sipariş ve teslimat sorusu");
  fireEvent.change(subject, { target: { value: "Özel başlığım" } });
  fireEvent.click(screen.getByRole("radio", { name: "Toplu alım ve cari hesap" }));
  expect(subject).toHaveValue("Özel başlığım");
  expect(message).toHaveAccessibleDescription(/yaklaşık alım adedini/);
});

it("focuses the first invalid field and clears its error after editing", () => {
  render(<ContactForm />);
  fireEvent.click(screen.getByRole("button", { name: "Mesaj gönder" }));
  const name = screen.getByLabelText("Ad soyad");
  expect(name).toHaveFocus();
  expect(name).toHaveAccessibleDescription("Adınızı yazın.");
  expect(send).not.toHaveBeenCalled();
  fireEvent.change(name, { target: { value: "Test Kullanıcısı" } });
  expect(name).toHaveAttribute("aria-invalid", "false");
});
