# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=/api
ARG VITE_KEYCLOAK_URL=http://localhost:8081
ARG VITE_KEYCLOAK_REALM=openlakehouse
ARG VITE_KEYCLOAK_CLIENT_ID=openlakehouse-web
ARG VITE_JUPYTER_URL=/jupyter
ARG VITE_JUPYTER_TOKEN=openlakehouse
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID \
    VITE_JUPYTER_URL=$VITE_JUPYTER_URL \
    VITE_JUPYTER_TOKEN=$VITE_JUPYTER_TOKEN
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Serve stage ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
