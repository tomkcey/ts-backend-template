#############################################

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

ARG PORT
ENV PORT_ENV=$PORT

ARG PROVIDER
ENV PROVIDER_ENV=$PROVIDER

CMD node index.js serve -p ${PORT_ENV} --provider ${PROVIDER_ENV}

#############################################

FROM node:18-alpine AS function

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./

RUN npm i --omit=dev

ARG FUNCTION_NAME
ENV FUNCTION_NAME_ENV=$FUNCTION_NAME

CMD node index.js function -n ${FUNCTION_NAME_ENV}