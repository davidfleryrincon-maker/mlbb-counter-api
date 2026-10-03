const express = require('express');
const { getCounters } = require('./src/services/counterService');
const { fetchLiveHeroesFromMLBBHub } = require('./src/services/mlbbHubClient');

const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/heroes', async (req, res) => {
  const heroes = await fetchLiveHeroesFromMLBBHub();
  res.json({ heroes });
});

async function sendCounters(req, res) {
  const hero = req.params.hero || req.query.hero;
  if (!hero) {
    return res.status(400).json({ error: "Falta el parámetro 'hero'" });
  }

  const result = await getCounters(hero, req.query.lane);
  return res.json(result);
}

app.get('/api/counters', sendCounters);
app.get('/api/counters/:hero', sendCounters);

app.get('/', async (req, res) => {
  if (req.query.getHeroes === 'true') {
    const heroes = await fetchLiveHeroesFromMLBBHub();
    return res.json({ heroes });
  }

  if (req.query.hero) return sendCounters(req, res);

  return res.json({
    name: 'MLBB Counter API',
    upstream: 'https://mlbbhub.com/',
    endpoints: [
      'GET /health',
      'GET /api/heroes',
      'GET /api/counters/:hero?lane=mid',
      'GET /?hero=Gusion&lane=mid',
      'GET /?getHeroes=true'
    ]
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`MLBB Counter API escuchando en http://localhost:${port}`);
  });
}

module.exports = app;