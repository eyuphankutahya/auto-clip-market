import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches the stock movement module beneath the admin guard", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/admin/stok-hareketleri").map((match) => match.routeId);
    expect(matches).toContain("/_authenticated/admin");
    expect(matches.at(-1)).toBe("/_authenticated/admin/stok-hareketleri");
  });

  it.each([["", "/"], ["/yeni", "/yeni"], ["/mal-kabulleri", "/mal-kabulleri"], ["/11111111-0000-0000-0000-000000000001", "/$id"]])("routes procurement %s through the admin guard", (suffix, routeSuffix) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes(`/admin/tedarikci-siparisleri${suffix}`).map((match) => match.routeId);
    expect(matches).toContain("/_authenticated/admin");
    expect(matches.at(-1)).toBe(`/_authenticated/admin/tedarikci-siparisleri${routeSuffix}`);
  });

  it.each(["satilan-urunler", "satilmayan-urunler", "tedarikci-alimlari", "stok-durumu"])("matches the %s report under the authenticated admin layout", (page) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes(`/admin/raporlar/${page}`).map((match) => match.routeId);
    expect(matches).toContain("/_authenticated/admin");
    expect(matches).toContain("/_authenticated/admin/raporlar");
    expect(matches.at(-1)).toBe(`/_authenticated/admin/raporlar/${page}`);
  });
});
