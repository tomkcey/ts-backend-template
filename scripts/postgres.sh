#!/bin/bash

docker run -it --rm \
    --name postgresql \
    --net=host \
    -p 5432:5432 \
    -e POSTGRES_PASSWORD=tomkcey \
    -e POSTGRES_USER=tomkcey \
    -e PGPASSWORD=tomkcey \
    postgres:latest
