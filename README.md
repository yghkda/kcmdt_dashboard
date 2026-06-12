# KGLD Dashboard Automation

This repository can run the KGLD daily onchain dashboard as a GitHub Actions workflow.

## Required GitHub Secrets

- `ALCHEMY_ETH_MAINNET_URL`: Alchemy Ethereum mainnet HTTPS endpoint.
- `KGLD_TELEGRAM_TOKEN`: Telegram bot token.
- `KGLD_TELEGRAM_CHAT_ID`: Telegram target chat ID.

## Workflow

The workflow in `.github/workflows/kgld-dashboard.yml` runs daily at `09:00 KST` and can also be started manually.

It performs these steps:

1. Fetch KGLD onchain data from Ethereum mainnet via Alchemy.
2. Refresh `outputs/kgld-dashboard/dashboard-data.js`.
3. Render `outputs/kgld-dashboard/kgld-daily-dashboard.png`.
4. Bundle the dashboard HTML files into `outputs/kgld-dashboard/kgld-dashboard-html.zip`.
5. Send the summary, image, and bundle to Telegram.
6. Commit the refreshed dashboard data back to the repository.
