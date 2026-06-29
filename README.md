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
3. Refresh `data/news-context.json`, `data/narrative-cache.json`, `data/narrative-history.json`, and their deployable copies under `outputs/kgld-dashboard/data`.
4. Render `outputs/kgld-dashboard/kgld-daily-dashboard.png`.
5. Bundle the dashboard HTML files into `outputs/kgld-dashboard/kgld-dashboard-html.zip`.
6. Send the summary, image, and bundle to Telegram.
7. Deploy `outputs/kgld-dashboard` to GitHub Pages.
8. Commit the refreshed dashboard data, news context, narrative cache, and narrative history back to the repository.

## News Context

The Content Desk uses a separate `news-context.json` file so news and onchain
data stay decoupled. The browser does not call a news API and does not expose
search keys. News collection is handled outside the browser through the Naver
News MCP. Save the MCP results to `data/naver-news-mcp-results.json`, then run:

```bash
npm run news:update
```

This creates both `data/news-context.json` and
`outputs/kgld-dashboard/data/news-context.json`. When MCP results are present,
the source is `naver_news_mcp` and each item includes title, publisher, source
URL, Naver URL, summary, tags, relevance, whether it can be used for content,
and a caution note. If the MCP result file is missing, the script writes a safe
fallback instead of presenting search links as articles. Future RSS or search
integrations should be added to the local/CI script only, not to the browser
client.

## Narrative Cache

The Market Intelligence Brief and Content Opportunities cards are static-page friendly. The browser
does not call Alchemy or expose API keys. Instead, local runs or GitHub Actions
refresh the cache first:

```bash
npm run narrative:update
```

This command uses only minimal read-only Alchemy calls: current gas and up to 10
recent ERC-20 transfers each for KGLD, PAXG, XAUT, USDC, and USDT. If the lookup fails, it writes a safe fallback
cache with `unknown` weather and `low` confidence. Individual token lookup
failures are isolated to that token where possible.

Raw tokenized-gold, stablecoin, gas, history, and watchlist data remains in the
cache, but the main UI only promotes meaningful changes such as a large
transfer, a baseline-backed change, or a verified fresh source. Query-limit
samples and collection states remain in the collapsed Developer Diagnostics.
The dashboard's
`Reload Narrative`/`Refresh Narrative` button only re-fetches the already
generated JSON from `outputs/kgld-dashboard/data/narrative-cache.json`.

Content Opportunities combines `news-context.json` with the latest onchain
narrative and uses `contentMode` values such as `fresh_news`,
`official_update`, `editorial`, `reframed`, or `no_content`. A news item must
have a valid date, HTTP URL, publisher, `verified: true`, and an
`official`/`media` source type before it can appear as a source. Search links and
watch items are never presented as articles. News items are used as marketing context only;
claims such as completed listing, active trading, guaranteed redemption, yield,
or price appreciation are intentionally blocked by caution fields.

## Information Layers

The page separates three responsibilities:

1. `KGLD Operations` uses only KGLD contract, supply, Issue, Redeem, risk, and transaction data.
2. `Market & RWA Intelligence` interprets external gold-token, stablecoin, gas, and RWA signals without changing the KGLD operations status.
3. `Content Opportunities` proposes writing angles and copy using news context plus onchain reference data.

When no verified fresh article is available, Content Opportunities explicitly
uses `editorial` mode instead of presenting manual watchlist entries as new
news.

`data/content-history.json` and `data/news-history.json` store recent selections.
The same KST date is replaced rather than appended twice, and the latest 60
entries are retained. Content angles used during the previous seven days are
deprioritized.

## Narrative History

`npm run narrative:update` also updates `data/narrative-history.json` and
`outputs/kgld-dashboard/data/narrative-history.json`. GitHub Actions reads the
existing history file, appends the latest successful Alchemy snapshot, replaces
any duplicate snapshot for the same KST date, and keeps only the most recent 30
snapshots.

The latest cache includes a compact `narrativeTrend` object derived from the
most recent seven snapshots. It tracks KGLD quiet streak, observed PAXG/XAUT
days, observed USDC/USDT days, gas-low days, and notable large-transfer days.
If fewer than three snapshots exist, the dashboard shows the 7-day trend card as
`추세 데이터 축적 중` rather than making a directional claim.

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
