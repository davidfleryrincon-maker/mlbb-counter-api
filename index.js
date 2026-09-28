const { fetchLiveHeroesFromMLBBHub } = require('./src/services/mlbbHubClient');
const { getCounters } = require('./src/services/counterService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { hero, lane, getHeroes } = req.query;

  if (getHeroes === 'true') {
    const heroes = await fetchLiveHeroesFromMLBBHub();
    return res.status(200).json({ heroes });
  }

  if (!hero) {
    return res.status(400).json({ error: "Falta el parámetro 'hero'" });
  }

  const result = await getCounters(hero, lane);
  return res.status(200).json(result);
};