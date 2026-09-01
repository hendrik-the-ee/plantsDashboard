FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci

COPY client/ client/
COPY server/ server/

ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --omit=dev --workspace=server

COPY --from=build /app/client/dist client/dist
COPY server/src server/src

ENV NODE_ENV=production
ENV UPLOADS_DIR=/data/uploads

EXPOSE 3001

CMD ["sh", "-c", "node server/src/scripts/migrate.js && node server/src/index.js"]
