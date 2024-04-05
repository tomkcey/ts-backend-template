FROM node:18-alpine AS build

WORKDIR /app

COPY package.json tsconfig.json ./
COPY src ./src

RUN npm i
RUN npm run build

#############################################

FROM node:18-alpine AS app

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./

RUN npm i --omit=dev

CMD ["node", "index.js"]