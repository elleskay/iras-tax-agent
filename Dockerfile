FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY agent.mjs tools.mjs hitl.mjs router.mjs ./
ENTRYPOINT ["node", "agent.mjs"]
CMD ["What is the GST registration threshold?"]
