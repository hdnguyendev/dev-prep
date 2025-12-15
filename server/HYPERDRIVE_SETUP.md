# 🚀 Cloudflare Hyperdrive Setup for Neon + Prisma

## Problem
Prisma Client doesn't fully support Cloudflare Workers. The `@neondatabase/serverless` Pool loses connectionString in Workers runtime.

## Solution: Cloudflare Hyperdrive
Hyperdrive provides connection pooling and query routing for Workers, making Prisma work reliably.

---

## 📋 Step-by-Step Setup

### 1. Create Hyperdrive Configuration

```bash
cd server

# Create Hyperdrive config with your Neon connection string
wrangler hyperdrive create dev-prep-db \
  --connection-string="postgres://user:pass@ep-xxx.neon.tech/dbname?sslmode=require"
```

**Output will be:**
```
Created Hyperdrive config
  ID: abc123def456...
  Name: dev-prep-db
```

### 2. Update `wrangler.toml`

Add Hyperdrive binding:

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "abc123def456..."  # Use the ID from step 1
```

### 3. Update Prisma Client Code

Modify `server/src/app/db/prisma.ts` to use Hyperdrive:

```typescript
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// In worker.ts, get Hyperdrive connection string
const getConnectionString = (c: Context) => {
  // Hyperdrive provides a connection string via binding
  return c.env.HYPERDRIVE?.connectionString || c.env.DATABASE_URL;
};

// Create Pool with Hyperdrive connection string
const pool = new Pool({ connectionString: getConnectionString(c) });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

### 4. Deploy

```bash
bun run deploy
```

---

## ✅ Benefits

- ✅ Stable connection pooling
- ✅ Global query routing
- ✅ Works with Prisma + Workers
- ✅ No connectionString loss issues

---

## 🔗 References

- [Cloudflare Hyperdrive Docs](https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/)
- [Hyperdrive + Prisma Guide](https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/#prisma)
