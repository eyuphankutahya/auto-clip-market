import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductImage } from "@/components/site/ProductImage";

vi.mock("@/lib/product-photo", () => ({
  resolveProductPhoto: async (path: string | null) => path && `/photos/${path}`,
}));

describe("compact product image", () => {
  it("opens the original photo from a compact thumbnail", async () => {
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><ProductImage name="Tampon klipsi" src="thumbnail.webp" original="original.jpg" compact /></QueryClientProvider>);
    expect(await screen.findByRole("img", { name: "Tampon klipsi" })).toHaveAttribute("src", "/photos/thumbnail.webp");
    fireEvent.click(screen.getByRole("button", { name: "Tampon klipsi fotoğrafını büyüt" }));
    const dialog = screen.getByRole("dialog", { name: "Tampon klipsi" });
    expect(await within(dialog).findByRole("img", { name: "Tampon klipsi" })).toHaveAttribute("src", "/photos/original.jpg");
  });

  it("shows a placeholder when no photo is stored", () => {
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><ProductImage name="Kapı klipsi" src={null} compact /></QueryClientProvider>);
    expect(screen.getByText("Kapı klipsi fotoğrafı görüntülenemiyor")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
