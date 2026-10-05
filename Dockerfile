FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs seed.mjs ./
COPY seed ./seed
COPY public ./public
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
USER node
CMD ["node", "server.mjs"]
