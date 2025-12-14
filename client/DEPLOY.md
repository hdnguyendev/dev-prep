# 🚀 Deployment Guide - Cloudflare Pages

## 📋 Prerequisites

1. **Cloudflare Account** (free tier is enough)
2. **Wrangler CLI** (already installed ✅)

---

## 🔐 Authentication

### Option 1: Interactive Login (Recommended for local)

```bash
cd client
bunx wrangler login
```

This will open a browser to authenticate with Cloudflare.

### Option 2: API Token (For CI/CD)

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Create token with **"Edit Cloudflare Workers"** template
3. Set environment variable:

```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
```

Or create `.env.local`:

```bash
CLOUDFLARE_API_TOKEN=your-token-here
```

---

## 🚀 Deploy Commands

### Full Deploy (Build + Upload)

```bash
cd client
bun run deploy
```

### Manual Steps

```bash
# 1. Build
cd client
bun run build

# 2. Deploy to Cloudflare Pages
bunx wrangler pages deploy dist --project-name=dev-prep-client
```

---

## ⚙️ Environment Variables

After first deploy, set environment variables in Cloudflare Dashboard:

1. Go to: **Cloudflare Dashboard** → **Pages** → **dev-prep-client** → **Settings** → **Environment variables**

2. Add these variables:

```bash
VITE_API_URL=https://your-backend-api.com
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

3. **Redeploy** for changes to take effect

---

## 🔄 Auto Deploy from Git

### Connect to GitHub

1. Go to **Cloudflare Dashboard** → **Pages** → **Create a project**
2. Connect your GitHub repo
3. Set build settings:
   - **Build command**: `cd client && bun install && bun run build`
   - **Build output directory**: `client/dist`
   - **Root directory**: `/`
4. Add environment variables
5. **Save and Deploy**

Now every push to `main` will auto-deploy! 🎉

---

## 🐛 Troubleshooting

### Error: "wrangler: command not found"
```bash
cd client
bun add -D wrangler
```

### Error: "Failed to fetch auth token"
```bash
bunx wrangler login
# Or set CLOUDFLARE_API_TOKEN
```

### Error: "Project not found"
First deployment will create the project automatically.

### SPA Routing Issues
Make sure `public/_redirects` exists:
```
/* /index.html 200
```

---

## 📊 After Deploy

Your app will be available at:
- Production: `https://dev-prep-client.pages.dev`
- Custom domain: Configure in Cloudflare Dashboard

**Preview deployments** are created for every git push!
