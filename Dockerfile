FROM node:22-alpine AS build
WORKDIR /app
# Use corepack to pin the exact pnpm version used in development
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist              /usr/share/nginx/html
COPY nginx.conf                          /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh               /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
