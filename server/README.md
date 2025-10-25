# Bun + Hono + Sequelize Backend

A modern backend API built with Bun, Hono, and Sequelize ORM.

## Features

- **Bun** - Fast JavaScript runtime
- **Hono** - Lightweight web framework
- **Sequelize ORM** - Powerful SQL ORM for Node.js
- **PostgreSQL** - Database
- **Zod** - Schema validation
- **Vitest** - Testing framework

## Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up database:**
   ```bash
   # Create PostgreSQL database
   createdb appdb
   
   # Run migrations
   bun run db:migrate
   ```

4. **Start development server:**
   ```bash
   bun run dev
   ```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /auth/login` - User login
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Users
- `POST /users` - Register new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }
  ```
- `GET /users/me` - Get current user (requires Bearer token)
- `PATCH /users/me` - Update current user (requires Bearer token)
  ```json
  {
    "fullName": "New Name"
  }
  ```

## Sample Requests

```bash
# Register user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"secret","fullName":"A"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"secret"}'

# Get user profile (replace TOKEN with actual token)
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer TOKEN"

# Update user profile
curl -X PATCH http://localhost:3000/users/me \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"New Name"}'
```

## Development

- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server
- `bun run test` - Run tests
- `bun run db:gen` - Generate database migrations
- `bun run db:migrate` - Run database migrations