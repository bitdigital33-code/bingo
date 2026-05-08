FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build:web

FROM node:22-alpine AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/apps/web/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
