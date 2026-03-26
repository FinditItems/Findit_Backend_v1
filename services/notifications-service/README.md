# Notifications Service

## Local commands

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init_notifications
npm run dev
```

## Docker

```bash
cd ../../infra
docker compose up -d --build notifications-service
```
