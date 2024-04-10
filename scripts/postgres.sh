#!/bin/bash

docker run -it --rm \
    --name postgresql \
    --net=host \
    -p 5432:5432 \
    -e POSTGRES_USER=localuser \
    -e POSTGRES_PASSWORD=localpass \
    -e PGPASSWORD=localpass \
    postgres:latest
