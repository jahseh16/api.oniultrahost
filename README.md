# api.oniultrahost

> Motor backend de OniUltrahost — REST API corriendo en `api.oniultrahost.lat`

## Stack

- **Runtime:** Node.js >= 18
- **Framework:** Express 4
- **Base de datos:** MongoDB (Mongoose 8)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`)
- **Deploy:** PM2 Cluster + NGINX reverse proxy

## Estructura

```
├── server.js                 # Entry point
├── ecosystem.config.js       # PM2 config
├── models/
│   └── User.js               # Schema: uuid, email, password, plan, status
├── controllers/
│   └── authController.js     # register, login, getMe
├── routes/
│   └── auth.js               # POST /register, POST /login, GET /me
├── middlewares/
│   ├── auth.js               # protect — valida JWT
│   └── adminOnly.js          # adminOnly — restringe a role=admin
└── logs/                     # Logs de PM2 (git-ignored)
```

## Setup en VPS

```bash
# 1. Clonar
git clone https://github.com/jahseh16/api.oniultrahost.git
cd api.oniultrahost

# 2. Instalar dependencias
npm install --omit=dev

# 3. Configurar variables de entorno
cp .env.example .env
nano .env   # rellenar MONGO_URI, JWT_SECRET, ALLOWED_ORIGINS

# 4. Lanzar con PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Endpoints

| Método | Ruta              | Auth | Descripción            |
|--------|-------------------|------|------------------------|
| GET    | /health           | ❌   | Health check           |
| POST   | /api/auth/register| ❌   | Crear cuenta           |
| POST   | /api/auth/login   | ❌   | Login → devuelve JWT   |
| GET    | /api/auth/me      | ✅   | Perfil del usuario     |

## NGINX reverse proxy (ejemplo)

```nginx
server {
    listen 443 ssl;
    server_name api.oniultrahost.lat;

    location / {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Generar JWT_SECRET seguro

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
