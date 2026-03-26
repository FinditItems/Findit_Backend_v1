# ---------- build stage ----------
FROM node:20.11.1-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime stage ----------
FROM node:20.11.1-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# swagger yaml
COPY src/docs ./src/docs

USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]