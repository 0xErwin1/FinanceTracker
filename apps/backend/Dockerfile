FROM node:24-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile

COPY . /app

ENV PORT 3000

EXPOSE 3000

RUN npm run build

CMD [ "npm", "start" ]
