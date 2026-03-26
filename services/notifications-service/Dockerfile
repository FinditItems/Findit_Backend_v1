# ---------- build stage ----------
FROM node:20.11.1-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---------- runtime stage ----------
FROM node:20.11.1-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=build /app/dist ./dist

# swagger yaml
COPY src/docs ./src/docs

USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
