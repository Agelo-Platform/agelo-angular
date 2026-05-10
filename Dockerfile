FROM node:20-alpine AS build
ARG API_BASE_URL=http://localhost:3000/api/v1
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Bake a default URL — overridden at container startup by docker-entrypoint.sh.
RUN sed -i "s|__API_BASE_URL__|$API_BASE_URL|g" src/environments/environment.prod.ts || true
RUN npx ng build --configuration production

FROM nginx:alpine
COPY --from=build /app/dist/agelo-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.d/40-Agelo-api-url.sh
RUN chmod +x /docker-entrypoint.d/40-Agelo-api-url.sh
EXPOSE 80
# nginx:alpine already runs files in /docker-entrypoint.d before nginx starts,
# so we just rely on that hook (no CMD override needed).
