FROM node:22-slim
WORKDIR /app
COPY package.json server.mjs ./
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
VOLUME /data
EXPOSE 8080
USER node
CMD ["node", "--disable-warning=ExperimentalWarning", "server.mjs"]
