export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegram_id } = req.query;

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    // Upstash Redis REST API
    const UPSTASH_URL = 'https://model-gnat-59147.upstash.io';
    const UPSTASH_TOKEN = 'AecLAAIncDFjODdjYTA1MTNiMTU0Mjc2OGZjOThjMTYxYjVkNGQ2ZXAxNTkxNDc';

    // Получаем Discord username из Redis
    const redisResponse = await fetch(`${UPSTASH_URL}/get/discord_username:${telegram_id}`, {
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`
      }
    });

    if (!redisResponse.ok) {
      console.error('Redis error:', await redisResponse.text());
      return res.status(200).json({ discord_username: null });
    }

    const data = await redisResponse.json();
    const discordUsername = data.result;

    return res.status(200).json({ 
      discord_username: discordUsername || null
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error.message,
      discord_username: null 
    });
  }
}
