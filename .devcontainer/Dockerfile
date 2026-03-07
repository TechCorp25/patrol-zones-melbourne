FROM mcr.microsoft.com/devcontainers/javascript-node:22-trixie

RUN apt-get update && apt-get install -y \
    libspatialindex-dev \
    && rm -rf /var/lib/apt/lists/*
