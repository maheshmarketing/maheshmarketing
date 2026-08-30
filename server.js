require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const app = express();
app.use(express.json({ limit: '1mb' }));
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
app.post('/api/payment/order', async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `MM_${Date.now()}`
    });

    res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ error: 'Unable to create payment order' });
  }
});
app.post('/api/payment/verify', (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment details'
      });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Payment signature verification failed'
      });
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id
    });

  } catch (err) {
    console.error('Payment verification error:', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to verify payment'
    });
  }
});
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/icon-192.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'icon-192.png'));
});

app.get('/icon-512.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'icon-512.png'));
});
app.get('/manifest.json', (req, res) => {
  res.json({
    name: "Mahesh Diaries",
    short_name: "Mahesh Diaries",
    description: "Premium diaries, paper products and corporate gifts from Mahesh Marketing.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#00104c",
    icons: [
  {
    src: "/icon-192.png",
    sizes: "192x192",
    type: "image/png"
  },
  {
    src: "/icon-512.png",
    sizes: "512x512",
    type: "image/png"
  }
]
  });
});


const seedProducts = [
  { id:'p1', name:'Premium Executive Diary 2026', category:'Diaries', price:499, image:'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80', description:'Hardbound A5 diary with dated pages and ribbon marker.', featured:true },
  { id:'p2', name:'Classic Corporate Diary', category:'Diaries', price:349, image:'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=900&q=80', description:'Smart daily planner, ideal for employee or client gifting.', featured:true },
  { id:'p3', name:'Custom Logo Notebook', category:'Paper Products', price:129, image:'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80', description:'Spiral notebook with your business logo on the cover.', featured:true },
  { id:'p4', name:'Premium Writing Pad', category:'Paper Products', price:159, image:'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80', description:'Smooth premium sheets for meetings and daily notes.', featured:false },
  { id:'p5', name:'Eco Stationery Gift Box', category:'Corporate Gifting', price:799, image:'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&w=900&q=80', description:'Notebook, pen, pouch and desk essentials in gift-ready packaging.', featured:true },
  { id:'p6', name:'Branded Pen & Diary Set', category:'Corporate Gifting', price:649, image:'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=80', description:'A polished gifting set, customisable with your company logo.', featured:true },
  { id:'p7', name:'Desk Calendar', category:'Corporate Gifting', price:199, image:'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=900&q=80', description:'Custom desk calendar for brand visibility all year.', featured:false },
  { id:'p8', name:'A4 Copier Paper (500 sheets)', category:'Paper Products', price:310, image:'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80', description:'Everyday 75 GSM A4 office paper.', featured:false }
];
async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id');

  if (error) throw error;
  return data || [];
}

async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

function adminOnly(req, res, next) {
  if (
    !process.env.ADMIN_TOKEN ||
    req.header('x-admin-token') !== process.env.ADMIN_TOKEN
  ) {
    return res.status(401).json({
      error: 'Admin access required.'
    });
  }
  next();
}

function validProduct(p) {
  return (
    p &&
    p.name &&
    p.category &&
    Number(p.price) >= 0
  );
}

// PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load products' });
  }
});

// CREATE ORDER
app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, notes, payment } = req.body;

    if (
      !customer?.name ||
      !customer?.phone ||
      !Array.isArray(items) ||
      !items.length
    ) {
      return res.status(400).json({
        error: 'Name, phone number and at least one item are required'
      });
    }

    const products = await getProducts();
    let total = 0;
    const cleanItems = [];

    for (const line of items) {
      const product = products.find(
        p => p.id === line.productId
      );

      const quantity = Number(line.quantity);

      if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          error: 'Invalid product or quantity'
        });
      }

      total += Number(product.price) * quantity;

      cleanItems.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity
      });
    }

    const order = {
      id: `MM-${Date.now().toString(36).toUpperCase()}`,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim()
      },
      items: cleanItems,
      notes: notes || '',
      total,
      status: 'New',
      payment: payment || null
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({
      error: 'Unable to create order'
    });
  }
});

// ADMIN LOGIN
app.post('/api/admin/login', (req, res) => {
  const token = req.body?.token;

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({
      error: 'Incorrect password'
    });
  }

  res.json({ ok: true });
});

// ADMIN ORDERS
app.get('/api/admin/orders', adminOnly, async (req, res) => {
  try {
    res.json(await getOrders());
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Unable to load orders'
    });
  }
});

// UPDATE ORDER
app.patch('/api/admin/orders/:id', adminOnly, async (req, res) => {
  try {
    const allowed = ['New', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
    const { status } = req.body;

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status'
      });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Unable to update order'
    });
  }
});

// ADD PRODUCT
app.post('/api/admin/products', adminOnly, async (req, res) => {
  try {
    if (!validProduct(req.body)) {
      return res.status(400).json({
        error: 'Name, category and valid price are required'
      });
    }

    const product = {
      id: req.body.id || `p${Date.now()}`,
      name: req.body.name,
      category: req.body.category,
      price: Number(req.body.price),
      image: req.body.image || '',
      description: req.body.description || '',
      featured: Boolean(req.body.featured)
    };

    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Unable to add product'
    });
  }
});

// UPDATE PRODUCT
app.put('/api/admin/products/:id', adminOnly, async (req, res) => {
  try {
    if (!validProduct(req.body)) {
      return res.status(400).json({
        error: 'Name, category and valid price are required'
      });
    }

    const update = {
      name: req.body.name,
      category: req.body.category,
      price: Number(req.body.price),
      image: req.body.image || '',
      description: req.body.description || '',
      featured: Boolean(req.body.featured)
    };

    const { data, error } = await supabase
      .from('products')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Unable to update product'
    });
  }
});

// DELETE PRODUCT
app.delete('/api/admin/products/:id', adminOnly, async (req, res) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Unable to delete product'
    });
  }
});
// IMPORT PRODUCTS FROM EXCEL
app.post(
  '/api/admin/products/import',
  adminOnly,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Please upload an Excel file.'
        });
      }

      const workbook = XLSX.read(req.file.buffer, {
        type: 'buffer'
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        return res.status(400).json({
          error: 'Excel sheet is empty.'
        });
      }

      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: ''
      });

      if (!rows.length) {
        return res.status(400).json({
          error: 'No products found in Excel.'
        });
      }

      const products = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        const id = String(row.id || '').trim();
        const name = String(row.name || '').trim();
        const category = String(row.category || '').trim();
        const price = Number(row.price);

        if (
          !id ||
          !name ||
          !category ||
          !Number.isFinite(price) ||
          price < 0
        ) {
          return res.status(400).json({
            error: `Invalid product data in Excel row ${i + 2}.`
          });
        }

        const featuredValue = String(row.featured || '')
          .trim()
          .toLowerCase();

        products.push({
          id,
          name,
          category,
          price,
          image: String(row.image || '').trim(),
          description: String(row.description || '').trim(),
          featured:
            featuredValue === 'true' ||
            featuredValue === '1' ||
            featuredValue === 'yes'
        });
      }

      const { data, error } = await supabase
        .from('products')
        .upsert(products, {
          onConflict: 'id'
        })
        .select();

      if (error) throw error;

      res.json({
        success: true,
        count: data.length,
        message: `${data.length} products imported successfully.`
      });

    } catch (err) {
      console.error('Excel import error:', err);

      res.status(500).json({
        error: 'Unable to import products from Excel.'
      });
    }
  }
);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(
    `Mahesh Marketing Store is running on http://localhost:${PORT}`
  );
});
