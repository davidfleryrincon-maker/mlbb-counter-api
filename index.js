const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors()); // Habilita CORS para que GitHub Pages pueda consultar la API

app.get('/api/counter', async (req, res) => {
  const hero = req.query.hero;
  if (!hero) {
    return res.status(400).json({ error: 'Debes proporcionar un nombre de héroe.' });
  }

  const heroSlug = hero.toLowerCase().trim().replace(/\s+/g, '-');
  const targetUrl = `https://mlbbhub.com/counter/${heroSlug}`;

  try {
    const { data } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const counters = [];

    // Extrae los nombres y detalles de los counters desde la estructura de MLBB Hub
    $('.counter-card, .hero-card, .counter-item').each((index, element) => {
      const name = $(element).find('.hero-name, .name, h3').text().trim();
      const winRate = $(element).find('.win-rate, .stat-value').text().trim();

      if (name && counters.length < 5) {
        counters.push({ name, winRate: winRate || 'N/A' });
      }
    });

    // Respuesta fallback si la estructura HTML varía ligeramente
    if (counters.length === 0) {
      return res.json({
        hero: heroSlug,
        source: targetUrl,
        counters: [],
        message: 'No se pudieron extraer automáticamente los datos directos, pero puedes consultar la fuente original.'
      });
    }

    res.json({
      hero: heroSlug,
      source: targetUrl,
      counters: counters
    });

  } catch (error) {
    res.status(500).json({
      error: 'Error al consultar MLBB Hub.',
      source: targetUrl,
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor API corriendo en el puerto ${PORT}`));
