#!/bin/bash

docker run --rm -it \
    --name redis \
    --net=host \
    -p 6379:6379 \
    redis:latest