import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ApiResponse } from 'shared/dist'
import { getEnv } from './config/env'

const app = new Hono()

app.use(cors())

app.get('/health', (c) => {
  const env = getEnv(c)
  const data: ApiResponse = {
    code: 200,
    data: env, 
  }
  return c.json(data, { status: 200 })
})

export default {
  port: 9999,
  fetch: app.fetch
}
