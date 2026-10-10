const crypto = require('node:crypto');
const { supabaseRequest } = require('../lib/supabase');

module.exports = async function pakasirWebhook(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metode request tidak diizinkan.' });
  }

  const expectedSecret = process.env.PAKASIR_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return res.status(500).json({ error: 'Webhook belum dikonfigurasi di server.' });
  }

  const receivedSecret = req.headers['x-secret'];
  if (typeof receivedSecret !== 'string') {
    return res.status(401).json({ error: 'Secret webhook tidak valid.' });
  }

  const expected = Buffer.from(expectedSecret);
  const received = Buffer.from(receivedSecret);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return res.status(401).json({ error: 'Secret webhook tidak valid.' });
  }

  const event = req.body;
  if (!event || typeof event !== 'object' || typeof event.txn_id !== 'string' ||
      typeof event.order_id !== 'string' || !Number.isInteger(event.amount) ||
      event.status !== 'completed') {
    return res.status(400).json({ error: 'Data webhook tidak valid atau belum selesai.' });
  }

  try {
    const query = new URLSearchParams({
      select: 'id,amount,payment_status',
      order_code: `eq.${event.order_id}`,
      txn_id: `eq.${event.txn_id}`,
      limit: '1'
    });
    const orders = await supabaseRequest(`orders?${query}`);
    const order = orders[0];
    if (!order || order.amount !== event.amount) {
      return res.status(404).json({ error: 'Pesanan webhook tidak ditemukan.' });
    }

    await supabaseRequest(`orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        payment_status: 'completed',
        order_status: 'sedang_dibuat',
        paid_at: new Date().toISOString()
      })
    });
    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(error.statusCode || 502).json({
      error: error.statusCode === 500 ? error.message : 'Status pesanan tidak dapat diperbarui.'
    });
  }
};
