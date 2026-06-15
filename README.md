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
3. Render `outputs/kgld-dashboard/kgld-daily-dashboard.png`.
4. Bundle the dashboard HTML files into `outputs/kgld-dashboard/kgld-dashboard-html.zip`.
5. Send the summary, image, and bundle to Telegram.
6. Commit the refreshed dashboard data back to the repository.

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
