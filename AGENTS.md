<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Bulk product/order edits use admin-checked transactional RPCs with expected revisions/statuses and confirmation; existing stock/cari triggers remain authoritative — avoids partial or stale batch writes.
- Admin change history is append-only through database triggers with admin-only reads; records begin at installation and never invent earlier changes — protects audit integrity.
- Audit list and full CSV export share one database-filtered query and Istanbul date boundaries; exports page through all matches and neutralize spreadsheet formulas — prevents incomplete or inconsistent downloads.
- Admin analytics use approved/shipped order snapshots for sales and independent credit transactions for payments, comparing equal Istanbul calendar periods — prevents invented financial allocation.
- Order list and CSV exports share server-applied filters; date bounds use Istanbul calendar days and CSV text neutralizes formulas — keeps exports complete, consistent and safe.
- Order prices are computed in the `place_order` SQL function (never trust client prices) — prevents tampering.
- Stock and cari debits change only via DB triggers (purchases, order status, `stock_adjustments` inserts for stock counts/imports) — single source of truth with history.
- Admin roles live in `user_roles` and are checked with `has_role`; normal signup never grants admin, and a service-managed one-time owner allowlist grants admin only after email confirmation — prevents public administrator takeover.
- Special-customer status is derived from an admin-created `customer_accounts` row linked uniquely to a profile, not a separate role — keeps discounts and cari authorization in one source of truth.
- Supplier codes live in the admin-only `product_supplier_codes` table, never on `products` — public catalog reads must not expose them.
- Supplier links permit multiple distinct codes per product/supplier; replace them through the admin-checked transactional RPC to avoid partial code deletion.
- Brand/location filtering uses the pure `catalog-rules` helpers with regression tests — keeps listing intersections and multi-code parsing consistent.
- Product code ordering uses the shared natural comparator in `catalog-rules` after all pages are fetched — keeps numeric and suffixed codes consistent across catalog, admin selectors and exports.
- Stock thresholds use shared validation and DB constraints; maximum stock is nullable and an inventory target, not a receipt restriction — preserves stock movement history.
- Package quantity is optional display metadata, validated as a positive integer; do not multiply prices, stock, or order quantities by it — avoids changing the existing unit-sale flow.
- Product lists are read with `fetchAll` (src/lib/fetch-all.ts) — the Data API caps responses at 1000 rows.
- Company contact/legal details live only in `src/lib/company.ts`; footer, contact and legal pages read from it — one place to update.
- Unbounded admin/customer lists page on the server with `Pager` (src/components/site/Pager.tsx) and `count: "exact"`; totals come from DB views (`account_balances`, `product_sales`) — avoids the 1000-row cap.
- Contact submissions use a validated public insert-only server function; messages are read through admin-scoped RLS, never returned by the public action — preserves visitor privacy and owner access.
- Catalog display pagination uses a URL page parameter after shared filtering and natural code ordering; filter changes reset it — keeps pages shareable without accumulating rendered product cards.
- Product photos share one image viewer for catalog and detail views, using contain-fit originals and an accessible dialog — preserves visible product details and consistent keyboard/touch behavior.
- Shortage reports are read-only, include zero stock or stock strictly below minimum, and suggest replenishment to maximum (or minimum when unset) without multiplying package quantities — separates purchase planning from stock movements.
- Shortage purchase drafts are screen-local, keyed by product, and grouped by an explicitly assigned linked supplier; exports contain only draft lines and never change stock — keeps selective procurement separate from receipts.
- Public catalog pages use the catalog_page RPC with database natural ordering; full-list admin tools retain fetchAll and the shared comparator — avoids transferring the full catalog to visitors.
- Photo uploads preserve originals in private storage and create separate detail/thumbnail variants; database rows contain paths only — preserves inspection quality without storing image bytes in tables.
- Stock imports and rollback use transactional RPCs with product revisions, and checkout uses a stable request key — prevents partial imports, unsafe rollback and duplicate orders.
- Cari purchase history joins approved/shipped order snapshots with separate credit transactions; never attribute an account payment to a specific product — preserves financial accuracy without invented payment allocation.
