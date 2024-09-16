#############################################

FROM node:20.11-alpine AS build

WORKDIR /app

COPY package.json tsconfig.json ./
COPY libs ./libs
COPY apps ./apps

RUN npm i
RUN npm run build -- --sourceMap false

#############################################

FROM node:20.11-alpine AS server

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/dist/apps ./apps
COPY --from=build /app/dist/libs ./libs

RUN npm i --omit=dev

CMD ["sh", "-c", "node apps/web/index.js serve"]

#############################################