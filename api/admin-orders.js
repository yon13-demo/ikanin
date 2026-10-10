const { supabaseRequest } = require('../lib/supabase');

module.exports = async function adminOrders(req, res) {
  if (process.env.DEMO_ADMIN_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Halaman tidak ditemukan.' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metode request tidak diizinkan.' });
  }

  try {
    const query = new URLSearchParams({
      select: 'order_code,quantity,amount,total_payment,payment_status,order_status,created_at,paid_at,customers(name,phone)',
      order: 'created_at.desc',
      limit: '500'
    });
    const orders = await supabaseRequest(`orders?${query}`);
    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(error.statusCode || 502).json({
      error: error.statusCode === 500 ? error.message : 'Daftar pesanan tidak dapat dimuat.'
    });
  }
};
