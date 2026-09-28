# mlbb-counter-api

API serverless para obtener counters de héroes de Mobile Legends a partir de MLBB Hub.

## Estructura

- `index.js`: entrada HTTP de Vercel, CORS y selección del endpoint.
- `src/data/heroes.js`: lista oficial, alias y prioridades por línea.
- `src/services/heroLogic.js`: normalización de héroes y líneas, slugs y razones tácticas.
- `src/services/mlbbHubClient.js`: consumo y extracción de datos de MLBB Hub.
- `src/services/counterService.js`: procesamiento, filtrado y orden de counters.

Este repositorio solo contiene el backend; todavía no hay interfaz, elementos visuales ni hojas de estilo.

## Endpoints

- `GET /?hero=Gusion&lane=mid`: counters del héroe, opcionalmente filtrados por línea.
- `GET /?getHeroes=true`: lista de héroes disponible.