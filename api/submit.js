import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // Данные из формы
    const {
      telegram_username,
      discord_username,
      subscription_period,
      subscription_price,
      file,
      agreement,
      captcha,
      telegram_user_id,
      telegram_first_name,
      submitted_at
    } = data;

    console.log('Received data:', {
      telegram_username,
      discord_username,
      subscription_period,
      subscription_price,
      file: file ? 'Present' : 'Missing'
    });

    // ID полей из вашей Tally формы (из Developer Tools)
    const TALLY_FORM_URL = 'https://api.tally.so/forms/npl4Lq/respond';
    const FIELD_IDS = {
      telegram_username: '6afa96e6-4e58-4c21-849f-8898b6171efe',
      discord_username: 'e4d19d6e-886b-4988-843b-70ee89597380',
      subscription_period: 'b3c6c52b-3390-42e1-b70b-04158f2e8f4d', // Текстовое поле
      agreement: 'df21de76-365e-437f-969e-fdf55b3a4b43',
      file_upload: '0c6c7732-f22b-437c-a814-614f5266ac89'
    };

    const AGREEMENT_ID = 'ecb1d79a-a60f-4588-9652-5b89b8a74fc5';

    // Шаг 1: Загружаем файл в Tally
    let fileId = null;
    
    if (file && file.data) {
      try {
        const fileBuffer = Buffer.from(file.data, 'base64');
        
        const fileForm = new FormData();
        fileForm.append('file', fileBuffer, {
          filename: file.name,
          contentType: file.type
        });

        const uploadResponse = await fetch('https://api.tally.so/upload', {
          method: 'POST',
          body: fileForm,
          headers: fileForm.getHeaders()
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          fileId = uploadData.id;
          console.log('File uploaded:', fileId);
        } else {
          console.error('File upload failed:', await uploadResponse.text());
        }
      } catch (fileError) {
        console.error('File upload error:', fileError);
      }
    }

    // Шаг 2: Создаём сессию
    const sessionUuid = generateUUID();
    const respondentUuid = generateUUID();

    // Шаг 3: Формируем данные для отправки
    const responses = {};
    
    // Telegram username
    responses[FIELD_IDS.telegram_username] = telegram_username;
    
    // Discord username
    responses[FIELD_IDS.discord_username] = discord_username;
    
    // Subscription period (текст)
    responses[FIELD_IDS.subscription_period] = subscription_period;
    
    // Agreement checkbox
    responses[FIELD_IDS.agreement] = [AGREEMENT_ID];
    
    // File upload
    if (fileId) {
      responses[FIELD_IDS.file_upload] = [{
        id: fileId,
        name: file.name,
        mimeType: file.type,
        size: file.data.length
      }];
    }

    // Данные для отправки в Tally
    const tallyPayload = {
      sessionUuid,
      respondentUuid,
      responses,
      captchas: {
        '6LdB13EeAAAAAEQ7MiLZmdG4pa28AD7K4V7x-tgG': {
          sitekey: '6LdB13EeAAAAAEQ7MiLZmdG4pa28AD7K4V7x-tgG',
          isCompleted: true
        }
      },
      isCompleted: true,
      password: null
    };

    console.log('Sending to Tally:', JSON.stringify(tallyPayload, null, 2));

    // Шаг 4: Отправляем в Tally
    const tallyResponse = await fetch(TALLY_FORM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://tally.so',
        'Referer': 'https://tally.so/r/npl4Lq'
      },
      body: JSON.stringify(tallyPayload)
    });

    console.log('Tally response status:', tallyResponse.status);
    const tallyText = await tallyResponse.text();
    console.log('Tally response:', tallyText);

    if (tallyResponse.ok || tallyResponse.status === 204) {
      return res.status(200).json({ 
        success: true, 
        message: 'Data sent to Tally successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send to Tally',
        details: tallyText
      });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Генератор UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
