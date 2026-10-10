const { normalizePhone, supabaseRequest } = require('../lib/supabase');

module.exports = async function customerLookup(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metode request tidak diizinkan.' });
  }

  const phone = normalizePhone(req.body && req.body.phone);
  if (!phone) {
    return res.status(400).json({ error: 'Masukkan nomor telepon Indonesia yang valid.' });
  }

  try {
    const customerQuery = new URLSearchParams({ select: 'id,name', phone: `eq.${phone}`, limit: '1' });
    const customers = await supabaseRequest(`customers?${customerQuery}`);
    const customer = customers[0];
    if (!customer) {
      return res.status(200).json({ registered: false, customer_name: null, orders: [] });
    }

    const ordersQuery = new URLSearchParams({
      select: 'order_code,quantity,amount,total_payment,payment_status,order_status,created_at,paid_at',
      customer_id: `eq.${customer.id}`,
      order: 'created_at.desc',
      limit: '20'
    });
    const orders = await supabaseRequest(`orders?${ordersQuery}`);
    return res.status(200).json({
      registered: true,
      customer_name: customer.name,
      orders
    });
  } catch (error) {
    return res.status(error.statusCode || 502).json({
      error: error.statusCode === 500 ? error.message : 'Data pelanggan belum dapat diperiksa.'
    });
  }
};
