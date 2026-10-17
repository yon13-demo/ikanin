const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { normalizePhone, supabaseRequest } = require('../lib/supabase');

const UNIT_PRICE = 10000;
const MAX_QUANTITY = 10;
const PROJECT_SLUG = 'lxpayment';

async function findCustomer(phone) {
  const query = new URLSearchParams({ select: 'id,name', phone: `eq.${phone}`, limit: '1' });
  const rows = await supabaseRequest(`customers?${query}`);
  return rows[0] || null;
}

module.exports = async function createTransaction(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metode request tidak diizinkan.' });
  }

  const apiKey = process.env.PAKASIR_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Pembayaran belum dikonfigurasi di server.' });
  }

  const quantity = req.body && Number(req.body.quantity);
  const phone = normalizePhone(req.body && req.body.phone);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return res.status(400).json({ error: 'Jumlah menu harus antara 1 dan 10.' });
  }
  if (!phone) {
    return res.status(400).json({ error: 'Nomor telepon tidak valid.' });
  }

  let order;
  let customer;
  try {
    customer = await findCustomer(phone);
    if (!customer) {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (name.length < 2 || name.length > 120) {
        return res.status(400).json({ error: 'Nama wajib diisi untuk pelanggan baru.' });
      }
      const query = new URLSearchParams({ on_conflict: 'phone' });
      const created = await supabaseRequest(`customers?${query}`, {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ name, phone })
      });
      customer = created[0] || await findCustomer(phone);
    }

    if (!customer) {
      return res.status(502).json({ error: 'Data pelanggan tidak dapat disimpan.' });
    }

    const unitPrice = process.env.DEMO_ADMIN_ENABLED === 'true' && req.body.test_mode === true
      ? 1
      : UNIT_PRICE;
    const amount = unitPrice * quantity;
    const orderCode = `FB${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const createdOrders = await supabaseRequest('orders', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        order_code: orderCode,
        customer_id: customer.id,
        quantity,
        amount,
        payment_status: 'creating',
        order_status: 'menunggu_pembayaran'
      })
    });
    order = createdOrders[0];
    if (!order || !order.id) {
      return res.status(502).json({ error: 'Pesanan tidak dapat disimpan.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    let payment;
    try {
      response = await fetch(
        `https://app.pakasir.com/api/v2/create-transaction/${PROJECT_SLUG}/${orderCode}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey
          },
          body: JSON.stringify({ method: 'qris', amount }),
          signal: controller.signal
        }
      );
      payment = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error('Pakasir gagal membuat QR pembayaran.');
    }
    if (typeof payment.txn_id !== 'string' || typeof payment.qr_string !== 'string' ||
        !Number.isInteger(payment.total_payment)) {
      throw new Error('Respons QR pembayaran dari Pakasir tidak lengkap.');
    }

    const qrCode = await QRCode.toDataURL(payment.qr_string, { width: 320, margin: 2 });
    await supabaseRequest(`orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        txn_id: payment.txn_id,
        payment_status: 'pending',
        total_payment: payment.total_payment
      })
    });

    return res.status(200).json({
      order_code: orderCode,
      txn_id: payment.txn_id,
      customer_name: customer.name,
      created_at: order.created_at,
      quantity,
      amount,
      total_payment: payment.total_payment,
      qr_code: qrCode
    });
  } catch (error) {
    if (order && order.id) {
      await supabaseRequest(`orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ payment_status: 'failed' })
      });
    }
    const statusCode = error.statusCode || 502;
    return res.status(statusCode).json({
      error: statusCode === 500
        ? error.message
        : 'Pesanan atau QR pembayaran gagal dibuat. Silakan coba lagi.'
    });
  }
};
