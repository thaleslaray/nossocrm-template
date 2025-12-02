# 🐳 Docker Setup Guide

## Quick Start

Execute os seguintes comandos:

```bash
# 1. Copie e preencha o arquivo .env
cp .env.example .env
# Edite .env e adicione a sua Supabase URL e anon key

# 2. Build and start
docker-compose up --build
```

## Access Points

- **Application**: http://localhost:3000

## Useful Commands

```bash
# View logs
docker-compose logs -f web

# Stop application
docker-compose down

# Restart application
docker-compose restart web

# Rebuild and restart
docker-compose up -d --build

# Check status
docker-compose ps

# Access container shell
docker-compose exec web sh
```

## Troubleshooting

### Hot reload not working

```bash
# Restart the container
docker-compose restart web

# Or rebuild
docker-compose up -d --build
```

## Environment Variables

É obrigatório preencher as variáveis de ambiente no arquivo `.env`:

```bash
# Supabase (get from: npx supabase status)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: AI features
VITE_GEMINI_API_KEY=your-gemini-key
```
