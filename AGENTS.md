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

- Benchstock stores all data in browser localStorage (key `benchstock-local-v1`) via `src/lib/inventory.ts`; keep that key so existing JSON backups and saved data keep working.
- Store reads happen after hydration (`useInventory().ready`, AppShell renders pages client-side) because localStorage does not exist during server rendering.
- Page styles live in plain CSS (`src/app.css`, `src/orders.css`) imported from `src/styles.css`, carried over from the original app.
- Order stage changes and filament deduction are pure functions in `src/lib/inventory.ts` (createOrder, startOrderInStore, completeOrderInStore) so they stay unit-tested; the hook only reads/writes storage around them.
- Shared data lives in one Lovable Cloud row (`shop_state`, id `main`) holding the whole store JSON; localStorage (`benchstock-local-v1`) is a local cache that `AuthGate` syncs (load on sign-in, debounced push on write, realtime pull). Why: keeps the pure store functions and backups unchanged.
- Access is invite-only: public sign-up is disabled; accounts are added in Cloud Users. Why: only the owner and partner may use the shop.
