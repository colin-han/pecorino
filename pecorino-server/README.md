# Usage
```yaml
# docker-compose.yaml
version: "3.2"

services:
  etcd:
    image: quay.io/coreos/etcd:v3.3.10
    container_name: etcd
    ports:
      - 2379:2379
      - 2380:2380
    volumes:
      - type: bind
        source: ${PWD}/data/etcd
        target: /etcd-data

    command:
      - "/usr/local/bin/etcd"
      - "--name"
      - "etcd-01"
      - "--data-dir"
      - "/etcd-data"
      - "--listen-client-urls"
      - "http://0.0.0.0:2379,http://0.0.0.0:4001"
      - "--advertise-client-urls"
      - "http://127.0.0.1:2379"
      - "--listen-peer-urls"
      - "http://0.0.0.0:2380"
      - "--initial-advertise-peer-urls"
      - "http://127.0.0.1:2380"
      - "--initial-cluster"
      - "etcd-01=http://127.0.0.1:2380"
      - "--initial-cluster-token"
      - "hw-p2m"
      - "--initial-cluster-state"
      - "new"

  etcd-browser:
    image: buddho/etcd-browser
    container_name: etcd-browser
    ports:
      - 5002:5002
    environment:
      - ETCD_HOST=etcd
      - ETCD_PORT=2379
      - SERVER_PORT=5002
    depends_on:
      - etcd
    links:
      - etcd:etcd

  pecorino:
    image: colinhan/pecorino:v1.0.4
    ports:
      - 4007:4007
    environment:
      - PRODUCTION=production_name
      - VERSION=v1.0
      - CONFIG=produciton
      - ETCD_CLUSTER=etcd:2379
    volumes:
      - ${PWD}/init:/code/dist/init
    depends_on:
      - etcd
    links:
      - etcd:etcd
```
