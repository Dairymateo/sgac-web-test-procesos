# ---- Stage 1: Build ----
FROM node:20-alpine AS build

WORKDIR /app

# Copiar manifiestos primero para aprovechar el cache de capas
COPY package*.json ./
RUN npm ci

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:alpine AS serve

# Configuración personalizada de nginx para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el build de Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
