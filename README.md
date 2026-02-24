# ssp-monitoring

Oracle DB is used for all data access (GVI and GOM pools)

- Repository factory: `src/server/order-flow/createOrderFlowRepository.ts`
- Integration usage: `src/server/order-flow/USAGE.md`


# Contaner information
build:
```
docker build -t ssp-monitoring .
```


run:
```
docker run -d --name ssp-monitoring -p 3000:3000 ssp-monitoring --env-file .env.local

docker run -p 3000:3000 --env-file $(pwd)/.env.local ssp-monitoring 
```


# Oracle Database Configuration for GVI (SSP Order Interface)
GVI_DB_USER=app
GVI_DB_PASSWORD=app
GVI_DB_CONNECT_STRING=localhost:1521/FREEPDB1

# Oracle Database Configuration for GOM (Order Management)
GOM_DB_USER=app
GOM_DB_PASSWORD=app
GOM_DB_CONNECT_STRING=localhost:1521/FREEPDB1

# Next.js Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000