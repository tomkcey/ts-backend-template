#!/bin/bash

docker run --rm -it \
    --name amqp \
    -p 5672:5672 \
    -p 15672:15672 \
    -e RABBITMQ_DEFAULT_USER=localuser \
    -e RABBITMQ_DEFAULT_PASS=localpass \
    rabbitmq:3.13.1-management