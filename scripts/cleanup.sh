#!/bin/bash

rm -rf node_modules
rm -rf dist
rm -rf coverage
rm -rf *.log

docker container ls -q | xargs docker container stop -f
docker container ls -q | xargs docker container kill -f
docker image ls -q | xargs docker image rm -f
docker volume ls -q | xargs docker volume rm -f
docker network ls -q | xargs docker network rm
docker system prune -f

docker ps -a
docker system df