#!/bin/bash

if [ -z "$1" ]; then
    echo "Please provide a command. Available commands: [serve]"
    exit 1
fi

if [ "$1" != "serve" ]; then
    echo "Invalid command. Available commands: [serve]"
    exit 1
fi

execute_server () {
    if [ -z "$2" ]; then
        echo "Please provide a port number to expose the container."
        exit 1
    fi

    docker build -t web . --target server

    docker run --rm -it \
        --name web \
        -p $2:$2 \
        --env-file .env \
        web

}

case "$1" in
    serve)
        execute_server $@
        ;;
    *)
        echo "Invalid command. Available commands: [serve]"
        exit 1
        ;;
esac