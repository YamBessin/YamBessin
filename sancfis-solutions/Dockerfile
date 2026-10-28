FROM node:22-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3080 DATA_DIR=/app/data USERS_FILE=/app/config/users.json AI_ENABLED=false
WORKDIR /app
COPY --chown=node:node package.json server.cjs catalog.cjs ./
COPY --chown=node:node public/ ./public/
COPY --chown=node:node scripts/ ./scripts/
RUN mkdir -p /app/data /app/config && chown -R node:node /app/data /app/config
USER node
EXPOSE 3080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3080/healthz',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.cjs"]
