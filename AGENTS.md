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
- Order prices are computed in the `place_order` SQL function (never trust client prices) — prevents tampering.
- Stock and cari debits change only via DB triggers (purchases, order status, `stock_adjustments` inserts for stock counts/imports) — single source of truth with history.
- Admin roles live in `user_roles` and are checked with `has_role`; normal signup never grants admin, and a service-managed one-time owner allowlist grants admin only after email confirmation — prevents public administrator takeover.
- Special-customer status is derived from an admin-created `customer_accounts` row linked uniquely to a profile, not a separate role — keeps discounts and cari authorization in one source of truth.
- Supplier codes live in the admin-only `product_supplier_codes` table, never on `products` — public catalog reads must not expose them.
- Product lists are read with `fetchAll` (src/lib/fetch-all.ts) — the Data API caps responses at 1000 rows.
- Company contact/legal details live only in `src/lib/company.ts`; footer, contact and legal pages read from it — one place to update.
- Unbounded admin/customer lists page on the server with `Pager` (src/components/site/Pager.tsx) and `count: "exact"`; totals come from DB views (`account_balances`, `product_sales`) — avoids the 1000-row cap.
