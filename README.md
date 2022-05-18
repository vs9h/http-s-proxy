# http-s-proxy
HTTP(S) proxy server (NodeJS)

## Configuring
1) Create .env file in http-s-proxy/
2) Set those variables:
  * SERVER_PORT
  * HOST_NAME
  * LOG_LEVEL (changes debug levels - DEBUG, INFO, ERROR)
  * TRACE_TCP_PACKETS

You can use `.env` file example (`.env.example`):

## Build
```
yarn
yarn build
```
## Running
```
yarn start
```

If you want to enable TCP packet sniffer set envoronment variable `TRACE_TCP_PACKETS` true and install `node` globally, then

```
sudo node dist/src/
```
