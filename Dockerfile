# Somnia — imagem de produção (Node 22, sem dependências npm)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data
COPY --chown=node:node . .
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1 || exit 1
CMD ["node", "server.js"]
