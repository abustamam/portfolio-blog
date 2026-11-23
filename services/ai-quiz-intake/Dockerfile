# Build context is the repo root, so the service can share src/utils/aiQuiz.ts with the site.
FROM oven/bun:1-alpine
WORKDIR /app
COPY src/utils/aiQuiz.ts src/utils/aiQuiz.ts
COPY services/ai-quiz-intake/src services/ai-quiz-intake/src
# The commit this image was built from; the server's deploy-blog script checks it.
ARG GIT_SHA=unknown
RUN printf '{"commit":"%s"}\n' "$GIT_SHA" > /app/build-info.json
USER bun
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/ai-quiz/health >/dev/null || exit 1
CMD ["bun", "services/ai-quiz-intake/src/server.ts"]
