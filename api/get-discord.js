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

    // Шаг 1: Получаем contact_id по telegram_id
    const telegramKeyResponse = await fetch(`${UPSTASH_URL}/get/telegram:${telegram_id}`, {
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`
      }
    });

    if (!telegramKeyResponse.ok) {
      console.error('Telegram key not found');
      return res.status(200).json({ discord_username: null });
    }

    const telegramData = await telegramKeyResponse.json();
    const contactId = telegramData.result;

    if (!contactId) {
      console.log('No contact_id found for telegram_id:', telegram_id);
      return res.status(200).json({ discord_username: null });
    }

    // Шаг 2: Получаем данные пользователя по contact_id
    const userDataResponse = await fetch(`${UPSTASH_URL}/get/user:${contactId}`, {
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`
      }
    });

    if (!userDataResponse.ok) {
      console.error('User data not found');
      return res.status(200).json({ discord_username: null });
    }

    const userDataResult = await userDataResponse.json();
    const userDataString = userDataResult.result;

    if (!userDataString) {
      console.log('No user data found for contact_id:', contactId);
      return res.status(200).json({ discord_username: null });
    }

    // Парсим JSON данные пользователя
    const userData = JSON.parse(userDataString);
    const discordUsername = userData.discord_username;

    console.log('Discord username found:', discordUsername);

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
