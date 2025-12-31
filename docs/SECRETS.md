# Required Secrets

Configure these secrets in your GitHub repository settings under **Settings > Secrets and variables > Actions**.

## Core API

| Secret | Description |
|--------|-------------|
| `CORE_BASE_URL` | Base URL of the Core API (e.g., `https://api.example.com`) |
| `WORKER_TOKEN` | Authentication token for the worker. Used in `X-WORKER-TOKEN` header for API requests and callbacks. |

## Cloudflare R2

| Secret | Description |
|--------|-------------|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID. Found in the Cloudflare dashboard URL or R2 settings. |
| `R2_ACCESS_KEY_ID` | R2 API token access key ID. Create an API token in Cloudflare R2 settings with Object Read & Write permissions. |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret access key. Generated alongside the access key ID. |
| `R2_BUCKET` | Name of the R2 bucket for storing processed assets. |

## Setting Up R2 API Tokens

1. Go to Cloudflare Dashboard > R2 > Manage R2 API Tokens
2. Click "Create API Token"
3. Set permissions to "Object Read & Write"
4. Optionally restrict to specific buckets
5. Copy the Access Key ID and Secret Access Key
