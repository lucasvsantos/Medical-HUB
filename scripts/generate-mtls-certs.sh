#!/usr/bin/env sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cert_dir="$repo_root/.mtls"
mkdir -p "$cert_dir"

docker run --rm \
  --mount "type=bind,source=$cert_dir,target=/certs" \
  alpine:3.22 sh -c '
    set -eu

    if [ -f /certs/ca.crt ] && [ -f /certs/auth-server.p12 ] && [ -f /certs/appointment-client.p12 ] && [ -f /certs/ca-truststore.p12 ] && [ -f /certs/.truststore-ready ]; then
      echo "certificados mTLS ja existem em .mtls"
      exit 0
    fi

    apk add --no-cache openssl >/dev/null
    rm -f /certs/ca.key /certs/ca.crt /certs/ca.srl \
      /certs/auth-server.key /certs/auth-server.csr /certs/auth-server.crt /certs/auth-server.p12 \
      /certs/appointment-client.key /certs/appointment-client.csr /certs/appointment-client.crt /certs/appointment-client.p12 \
      /certs/ca-truststore.p12

    openssl req -x509 -newkey rsa:4096 -sha256 -nodes \
      -keyout /certs/ca.key -out /certs/ca.crt -days 3650 \
      -subj "/CN=medical-hub-dev-ca" \
      -addext "basicConstraints=critical,CA:TRUE,pathlen:1" \
      -addext "keyUsage=critical,keyCertSign,cRLSign"

    openssl req -new -newkey rsa:2048 -sha256 -nodes \
      -keyout /certs/auth-server.key -out /certs/auth-server.csr \
      -subj "/CN=auth-service" \
      -addext "subjectAltName=DNS:auth-app,DNS:auth-service,DNS:localhost" \
      -addext "extendedKeyUsage=serverAuth"
    openssl x509 -req -sha256 -days 825 \
      -in /certs/auth-server.csr -CA /certs/ca.crt -CAkey /certs/ca.key -CAcreateserial \
      -out /certs/auth-server.crt -copy_extensions copy

    openssl req -new -newkey rsa:2048 -sha256 -nodes \
      -keyout /certs/appointment-client.key -out /certs/appointment-client.csr \
      -subj "/CN=appointment-service" \
      -addext "subjectAltName=DNS:appointment-app,DNS:appointment-service,DNS:localhost" \
      -addext "extendedKeyUsage=clientAuth"
    openssl x509 -req -sha256 -days 825 \
      -in /certs/appointment-client.csr -CA /certs/ca.crt -CAkey /certs/ca.key -CAcreateserial \
      -out /certs/appointment-client.crt -copy_extensions copy

    openssl pkcs12 -export -out /certs/auth-server.p12 \
      -inkey /certs/auth-server.key -in /certs/auth-server.crt -certfile /certs/ca.crt \
      -name auth-service -passout pass:changeit
    openssl pkcs12 -export -out /certs/appointment-client.p12 \
      -inkey /certs/appointment-client.key -in /certs/appointment-client.crt -certfile /certs/ca.crt \
      -name appointment-service -passout pass:changeit
    openssl pkcs12 -export -nokeys -out /certs/ca-truststore.p12 \
      -in /certs/ca.crt -name medical-hub-dev-ca -passout pass:changeit

    rm -f /certs/ca.srl /certs/auth-server.csr /certs/appointment-client.csr
    chmod 600 /certs/*.key /certs/*.p12
    chmod 644 /certs/*.crt
    echo "certificados mTLS gerados em .mtls"
  '

docker run --rm \
  --mount "type=bind,source=$cert_dir,target=/certs" \
  eclipse-temurin:21-jdk-alpine \
  keytool -importcert -noprompt \
    -alias medical-hub-dev-ca \
    -file /certs/ca.crt \
    -keystore /certs/ca-truststore.p12 \
    -storetype PKCS12 \
    -storepass changeit

touch "$cert_dir/.truststore-ready"
