# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Web và API cùng một domain (nginx chuyển /api sang API) nên đường dẫn tương đối
ARG VITE_API_URL=/api/v1
ARG VITE_IMG_CDN=
ENV VITE_API_URL=$VITE_API_URL VITE_IMG_CDN=$VITE_IMG_CDN
RUN npx vite build

# ---- phục vụ ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
