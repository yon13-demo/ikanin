function getConfig() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error('Supabase belum dikonfigurasi di server.');
    error.statusCode = 500;
    throw error;
  }

  const url = new URL(SUPABASE_URL);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    const error = new Error('URL Supabase harus menggunakan HTTPS.');
    error.statusCode = 500;
    throw error;
  }

  return { url, key: SUPABASE_SERVICE_ROLE_KEY };
}

async function supabaseRequest(path, options = {}) {
  const { url, key } = getConfig();
  const endpoint = new URL(`/rest/v1/${path}`, url);
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Supabase mengembalikan respons yang tidak valid.');
  }

  if (!response.ok) {
    const error = new Error('Permintaan Supabase gagal.');
    error.statusCode = 502;
    throw error;
  }

  return result;
}

function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  let phone = value.replace(/\D/g, '');
  if (phone.startsWith('62')) phone = `0${phone.slice(2)}`;
  if (phone.length < 10 || phone.length > 15 || !phone.startsWith('0')) return null;
  return phone;
}

module.exports = { normalizePhone, supabaseRequest };
