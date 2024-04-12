#!/bin/bash

if [ -z "$1" ]; then
    echo "Please provide a command. Available commands: [function, serve]"
    exit 1
fi

if [ "$1" != "function" ] && [ "$1" != "serve" ]; then
    echo "Invalid command. Available commands: [function, serve]"
    exit 1
fi

execute_function () (
    if [ -z "$2" ]; then
        echo "Please provide a function name"
        exit 1
    fi

    docker build -t app . --target function --build-arg FUNCTION_NAME=$2

    docker run --rm -it \
        --name app \
        --env-file .env \
        app
)

execute_server () {
    if [ -z "$2" ]; then
        echo "Please provide a port number"
        exit 1
    fi

    if [ -z "$3" ]; then
        echo "Please provide a provider. Available providers: [koa]"
        exit 1
    fi

    docker build -t app . --target app --build-arg PORT=$2 --build-arg PROVIDER=$3

    docker run --rm -it \
        --name app \
        -p $2:$2 \
        --env-file .env \
        app

}

case "$1" in
    function)
        execute_function $@
        ;;
    serve)
        execute_server $@
        ;;
    *)
        echo "Invalid command. Available commands: [function, serve]"
        exit 1
        ;;
esac