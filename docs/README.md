# asset-bundler

Generic scheduled worker that processes image transform jobs and uploads output bundles to object storage.

## Setup

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
npm ci
```

### Configuration

Configure the required environment variables. See [SECRETS.md](./SECRETS.md) for the full list:

- `CORE_BASE_URL` - Base URL of the Core API
- `WORKER_TOKEN` - Authentication token
- `R2_ACCOUNT_ID` - Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key
- `R2_BUCKET` - R2 bucket name

For local development, create a `.env` file (not committed):

```bash
cp .env.example .env
# Edit .env with your values
```

### Running Locally

```bash
# Build and run
npm run run

# Or separately:
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## GitHub Actions

The worker runs automatically every minute via the cron workflow at `.github/workflows/worker.yml`.

### Setting Up Secrets

1. Go to your repository's **Settings > Secrets and variables > Actions**
2. Add each secret listed in [SECRETS.md](./SECRETS.md)

## Specification

See [V1_MASTER_SPEC.md](./V1_MASTER_SPEC.md) for the full technical specification.

## Verification

Run the verification script to check the build:

```bash
./scripts/verify.sh
```
