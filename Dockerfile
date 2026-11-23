# Stage 1: build the static site
FROM oven/bun:alpine AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Stage 2: serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# The commit this image was built from. The server's deploy-blog script checks it
# after a deploy, and https://bustamam.tech/build-info.json shows what is live.
# Last, so a new SHA does not invalidate any layer above.
ARG GIT_SHA=unknown
RUN printf '{"commit":"%s"}\n' "$GIT_SHA" > /usr/share/nginx/html/build-info.json
EXPOSE 80
