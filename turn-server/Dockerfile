FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    coturn \
    && rm -rf /var/lib/apt/lists/*

# Copy config
COPY turnserver.conf /etc/turnserver.conf

EXPOSE 3478/tcp 3478/udp
EXPOSE 5349/tcp 5349/udp
EXPOSE 49152-65535/udp

ENTRYPOINT ["turnserver", "-c", "/etc/turnserver.conf", "--no-daemon"]
