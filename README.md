# KGLD Dashboard Automation

This repository can run the KGLD daily onchain dashboard as a GitHub Actions workflow.

## Required GitHub Secrets

- `ALCHEMY_ETH_MAINNET_URL`: Alchemy Ethereum mainnet HTTPS endpoint.
- `KGLD_TELEGRAM_TOKEN`: Telegram bot token.
- `KGLD_TELEGRAM_CHAT_ID`: Telegram target chat ID.

## Workflow

The workflow in `.github/workflows/kgld-dashboard.yml` is started through
`workflow_dispatch`. It can be run manually or triggered by an external scheduler.

It performs these steps:

1. Fetch KGLD onchain data from Ethereum mainnet via Alchemy.
2. Refresh `outputs/kgld-dashboard/dashboard-data.js`.
3. Refresh `data/narrative-cache.json` and `outputs/kgld-dashboard/data/narrative-cache.json`.
4. Render `outputs/kgld-dashboard/kgld-daily-dashboard.png`.
5. Bundle the dashboard HTML files into `outputs/kgld-dashboard/kgld-dashboard-html.zip`.
6. Send the summary, image, and bundle to Telegram.
7. Deploy `outputs/kgld-dashboard` to GitHub Pages.
8. Commit the refreshed dashboard data and narrative cache back to the repository.

## Narrative Cache

The Market Weather and Content Idea cards are static-page friendly. The browser
does not call Alchemy or expose API keys. Instead, local runs or GitHub Actions
refresh the cache first:

```bash
npm run narrative:update
```

This command uses only minimal read-only Alchemy calls: current gas and up to 10
recent ERC-20 transfers each for KGLD, PAXG, XAUT, USDC, and USDT. If the lookup fails, it writes a safe fallback
cache with `unknown` weather and `low` confidence. Individual token lookup
failures are isolated to that token where possible.

The RWA Sector Pulse card currently uses a lightweight watchlist only:
tokenized gold activity, USDC/USDT activity as a stablecoin liquidity proxy, and
gas condition. Protocol-specific RWA data such as Ondo, BUIDL, tokenized
treasury, or DeFi RWA protocol flows is intentionally marked `limited_data`
until a future Dune or The Graph integration is added. The dashboard's
`Reload Narrative`/`Refresh Narrative` button only re-fetches the already
generated JSON from `outputs/kgld-dashboard/data/narrative-cache.json`.

To prepare and validate the static dashboard locally without exposing API keys
in the browser:

```bash
npm run build
```

Full onchain dashboard data refresh remains available as:

```bash
npm run update-dashboard
```

## GitHub Pages

Configure the repository in `Settings > Pages` with `Source: GitHub Actions`.
The workflow deploys the dashboard after each successful run.

Expected public URL:

```text
https://yghkda.github.io/kcmdt_dashboard/
```

## External Schedule

GitHub's repository scheduler did not create scheduled runs reliably for this
repository. Use an external scheduler such as cron-job.org to call:

```text
POST https://api.github.com/repos/yghkda/kcmdt_dashboard/actions/workflows/kgld-dashboard.yml/dispatches
```

Required headers:

```text
Accept: application/vnd.github+json
Authorization: Bearer <FINE_GRAINED_GITHUB_TOKEN>
Content-Type: application/json
X-GitHub-Api-Version: 2022-11-28
```

Request body:

```json
{"ref":"main"}
```

Create a fine-grained GitHub token limited to this repository with the
`Actions: Read and write` permission. Configure the external scheduler for
`09:07 Asia/Seoul`.
