# ---------- build stage ----------
    FROM node:20.11.1-slim AS build
    WORKDIR /app
    
    RUN apt-get update -y && apt-get install -y openssl
    
    COPY package*.json ./
    RUN npm ci
    
    COPY prisma ./prisma
    RUN npx prisma generate
    
    COPY tsconfig.json ./
    COPY src ./src
    
    RUN npm run build
    
    # ---------- runtime stage ----------
    FROM node:20.11.1-slim
    WORKDIR /app
    ENV NODE_ENV=production
    
    RUN apt-get update -y && apt-get install -y openssl
    
    COPY --from=build /app/package*.json ./
    COPY --from=build /app/node_modules ./node_modules
    COPY --from=build /app/dist ./dist
    COPY --from=build /app/src/docs ./src/docs
    COPY --from=build /app/prisma ./prisma
    
    USER node
    EXPOSE 4000
    CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
