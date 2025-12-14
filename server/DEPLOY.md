# 🚀 Backend Deployment - Cloudflare Workers

## 📋 Prerequisites

1. **Cloudflare Account** (free tier is fine)
2. **External PostgreSQL Database** with connection pooling:
   - ✅ **Neon** (recommended, has built-in pooling)
   - ✅ **Supabase** (with connection pooling enabled)
   - ✅ **Railway** with PgBouncer
   - ❌ **NOT** direct PostgreSQL (Cloudflare Workers need pooled connections)

---

## 🗄️ Database Setup

### Option 1: Neon (Recommended)

1. Go to: https://neon.tech
2. Create new project
3. Copy **Pooled Connection String**:
   ```
   postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```
4. Run migrations:
   ```bash
   DATABASE_URL="your-neon-connection-string" bunx prisma db push
   ```

### Option 2: Supabase

1. Go to: https://supabase.com
2. Create new project
3. Get connection string from **Settings** → **Database** → **Connection Pooling** (port 6543)
4. Run migrations

---

## 🔐 Authentication & Secrets

### 1. Login to Cloudflare

```bash
cd server
bun run cf:login
```

### 2. Set Secret Environment Variables

```bash
# Database (with connection pooling!)
wrangler secret put DATABASE_URL
# Paste your Neon/Supabase POOLED connection string

# Clerk
wrangler secret put CLERK_PUBLISHABLE_KEY
wrangler secret put CLERK_SECRET_KEY

# JWT (generate random string)
wrangler secret put JWT_SECRET

# Optional: API URL for CORS
wrangler secret put API_URL
```

### Generate JWT Secret:

```bash
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🚀 Deploy

### First Deployment

```bash
cd server

# Install wrangler if not already
bun add -D wrangler

# Deploy to production
bun run deploy
```

### Development/Staging

```bash
# Deploy to dev environment
bun run deploy:dev
```

---

## ⚙️ Configuration Files

### `wrangler.toml` (already created ✅)

```toml
name = "dev-prep-api"
main = "src/worker.ts"
compatibility_date = "2025-12-14"
compatibility_flags = ["nodejs_compat"]

[vars]
NODE_ENV = "production"

# Secrets are set via CLI (wrangler secret put)
```

### Environment-specific configs

Create `wrangler.dev.toml` for staging:

```toml
name = "dev-prep-api-dev"
main = "src/worker.ts"
compatibility_date = "2025-12-14"
compatibility_flags = ["nodejs_compat"]

[vars]
NODE_ENV = "development"
```

---

## 🔗 Custom Domain

### Setup Custom Domain

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **dev-prep-api**
2. Click **Settings** → **Domains & Routes**
3. Add custom domain:
   - `api.dev-prep.com`
   - Or add route pattern: `api.dev-prep.com/*`

### Update Frontend API URL

Update your frontend `.env`:

```bash
VITE_API_URL=https://dev-prep-api.your-subdomain.workers.dev
# Or with custom domain:
VITE_API_URL=https://api.dev-prep.com
```

---

## 📊 Monitoring

### View Real-time Logs

```bash
cd server
bun run cf:tail
```

### Cloudflare Dashboard

- **Analytics**: Dashboard → Workers & Pages → dev-prep-api → Metrics
- **Logs**: Real-time logs in dashboard
- **Errors**: Automatic error tracking

---

## 🐛 Troubleshooting

### Error: "Could not connect to database"

- ✅ Verify you're using **POOLED** connection string (Neon/Supabase)
- ✅ Check `?sslmode=require` or `?ssl=true` in connection string
- ❌ Direct PostgreSQL connections don't work on Workers

### Error: "Prisma Client initialization error"

Add to `prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

Then regenerate:

```bash
bunx prisma generate
```

### Error: "Module not found"

Cloudflare Workers use different module resolution. Make sure all imports use:
- `import { ... } from "hono"` (not "hono/bun")
- No `fs` or `path` Node.js modules

### File Uploads Don't Work

Cloudflare Workers don't have filesystem access. Options:
1. Use **Cloudflare R2** for object storage
2. Use **Cloudflare Images** for image uploads
3. Use external service (AWS S3, Uploadthing)

---

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: cd server && bun install
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: server
```

**Set GitHub Secret:**
1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add `CLOUDFLARE_API_TOKEN`

---

## 📝 Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] All secrets set via `wrangler secret put`
- [ ] API accessible at Worker URL
- [ ] Health check works: `curl https://your-worker.workers.dev/health`
- [ ] Frontend can connect to API
- [ ] CORS configured correctly
- [ ] Custom domain setup (optional)
- [ ] Monitoring enabled

---

## 💰 Pricing

**Cloudflare Workers Free Tier:**
- ✅ 100,000 requests/day
- ✅ 10ms CPU time per request
- ✅ Unlimited bandwidth

**Paid Plan ($5/month):**
- 10 million requests/month
- 50ms CPU time per request
- Additional features

Most apps start on **free tier** comfortably! 🎉

---

## 🔗 Useful Links

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono on Cloudflare](https://hono.dev/getting-started/cloudflare-workers)
- [Prisma with Workers](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare)
- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
