export async function handler(event, context) {
  const REAL_GOOGLE_SHEET_URL = process.env.REAL_GOOGLE_SHEET_URL;

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: ''
    };
  }

  if (!REAL_GOOGLE_SHEET_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Lỗi cấu hình phía máy chủ: URL của Google Script chưa được định nghĩa." }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Phương thức không hợp lệ. Chỉ chấp nhận POST.' }),
    };
  }

  try {
    const response = await fetch(REAL_GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: event.body,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Lỗi trong proxy function:', error);
    return {
      statusCode: 502,
      body: JSON.stringify({ message: 'Lỗi khi giao tiếp với máy chủ Google Script: ' + error.message }),
    };
  }
}