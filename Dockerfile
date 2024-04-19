#############################################

FROM node:18-alpine AS build

WORKDIR /app

COPY package.json tsconfig.json ./
COPY src ./src

RUN npm i
RUN npm run build

#############################################

FROM node:18-alpine AS server

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./

RUN npm i --omit=dev

CMD node --require ./utils/otlp.js index.js serve

#############################################

FROM node:18-alpine AS function

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./

RUN npm i --omit=dev

ARG FUNCTION_NAME
ENV FUNCTION_NAME_ENV=$FUNCTION_NAME

CMD node --require ./utils/otlp.js  index.js function -n ${FUNCTION_NAME_ENV}