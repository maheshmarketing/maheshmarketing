require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
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

function readStore() {
  if (!fs.existsSync(DATA_FILE)) { fs.mkdirSync(DATA_DIR, { recursive:true }); const initial={products:seedProducts,orders:[]}; fs.writeFileSync(DATA_FILE, JSON.stringify(initial,null,2)); return initial; }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeStore(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function adminOnly(req, res, next) {
  if (!process.env.ADMIN_TOKEN || req.header('x-admin-token') !== process.env.ADMIN_TOKEN) return res.status(401).json({ error:'Admin access required.' });
  next();
}
function validProduct(p) { return p && p.name && p.category && Number(p.price) >= 0; }

app.get('/api/products', (req,res) => res.json(readStore().products));
app.post('/api/orders', (req,res) => {
  const { customer, items, notes } = req.body;
  if (!customer?.name || !customer?.phone || !Array.isArray(items) || !items.length) return res.status(400).json({error:'Name, phone number and at least one item are required.'});
  const db=readStore(); let total=0; const cleanItems=[];
  for (const line of items) { const product=db.products.find(p=>p.id===line.productId); const quantity=Number(line.quantity); if (!product || !Number.isInteger(quantity) || quantity<1) return res.status(400).json({error:'One or more products are invalid.'}); total += product.price*quantity; cleanItems.push({productId:product.id,name:product.name,price:product.price,quantity}); }
  const order={ id:`MM-${Date.now().toString(36).toUpperCase()}`, createdAt:new Date().toISOString(), customer:{name:customer.name.trim(),phone:customer.phone.trim(),email:(customer.email||'').trim(),address:(customer.address||'').trim()}, items:cleanItems, notes:(notes||'').trim(), total, status:'New' };
  db.orders.unshift(order); writeStore(db); res.status(201).json({order});
});
app.post('/api/admin/login', adminOnly, (req,res)=>res.json({ok:true}));
app.get('/api/admin/orders', adminOnly, (req,res)=>res.json(readStore().orders));
app.patch('/api/admin/orders/:id', adminOnly, (req,res)=>{ const db=readStore(); const order=db.orders.find(o=>o.id===req.params.id); const statuses=['New','Confirmed','Processing','Dispatched','Completed','Cancelled']; if(!order) return res.status(404).json({error:'Order not found.'}); if(!statuses.includes(req.body.status)) return res.status(400).json({error:'Invalid status.'}); order.status=req.body.status; writeStore(db); res.json(order); });
app.post('/api/admin/products', adminOnly, (req,res)=>{ if(!validProduct(req.body)) return res.status(400).json({error:'Name, category and valid price are required.'}); const db=readStore(); const product={id:crypto.randomUUID(),name:req.body.name.trim(),category:req.body.category.trim(),price:Number(req.body.price),image:req.body.image||'',description:req.body.description||'',featured:!!req.body.featured}; db.products.push(product); writeStore(db); res.status(201).json(product); });
app.put('/api/admin/products/:id', adminOnly, (req,res)=>{ if(!validProduct(req.body)) return res.status(400).json({error:'Name, category and valid price are required.'}); const db=readStore(); const n=db.products.findIndex(p=>p.id===req.params.id); if(n<0) return res.status(404).json({error:'Product not found.'}); db.products[n]={...db.products[n],...req.body,id:req.params.id,price:Number(req.body.price),featured:!!req.body.featured}; writeStore(db); res.json(db.products[n]); });
app.delete('/api/admin/products/:id', adminOnly, (req,res)=>{ const db=readStore(); const original=db.products.length; db.products=db.products.filter(p=>p.id!==req.params.id); if(db.products.length===original) return res.status(404).json({error:'Product not found.'}); writeStore(db); res.status(204).end(); });
app.get('*', (_,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT, ()=>console.log(`Mahesh Marketing Store is running at http://localhost:${PORT}`));
