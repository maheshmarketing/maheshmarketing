const money=n=>`₹${Number(n).toLocaleString('en-IN')}`;
let products=[], category='All', cart=JSON.parse(localStorage.getItem('mm-cart')||'[]');
const $=s=>document.querySelector(s); const save=()=>{localStorage.setItem('mm-cart',JSON.stringify(cart)); renderCart()};
async function load(){ products=await (await fetch('/api/products')).json(); renderFilters(); renderProducts(); renderCart(); }
function renderFilters(){const cats=['All',...new Set(products.map(p=>p.category))]; $('#filters').innerHTML=cats.map(c=>`<button class="${c===category?'active':''}" onclick="setCategory('${c}')">${c}</button>`).join('')}
function setCategory(c){category=c;renderFilters();renderProducts()} window.setCategory=setCategory;
function renderProducts(){const visible=category==='All'?products:products.filter(p=>p.category===category); $('#products-grid').innerHTML=visible.map(p=>`<article class="product"><img src="${p.image||'https://placehold.co/600x400?text=Mahesh+Marketing'}" alt="${p.name}"><div class="product-info"><span class="category">${p.category}</span><h3>${p.name}</h3><p>${p.description||''}</p><div class="price-row"><b>${money(p.price)}</b><button class="add" onclick="add('${p.id}')">Add to cart</button></div></div></article>`).join('')}
function add(id){const found=cart.find(x=>x.productId===id);if(found)found.quantity++;else cart.push({productId:id,quantity:1});save();openCart()} window.add=add;
function renderCart(){const lines=cart.map(line=>({...line,p:products.find(p=>p.id===line.productId)})).filter(x=>x.p); const total=lines.reduce((sum,x)=>sum+x.p.price*x.quantity,0); $('#cart-count').textContent=lines.reduce((s,x)=>s+x.quantity,0);$('#cart-total').textContent=money(total);$('#cart-empty').style.display=lines.length?'none':'block';$('#cart-items').innerHTML=lines.map(x=>`<div class="cart-item"><img src="${x.p.image}" alt=""><div><b>${x.p.name}</b><small>${money(x.p.price)}</small><div class="quantity"><button onclick="change('${x.productId}',-1)">−</button><span>${x.quantity}</span><button onclick="change('${x.productId}',1)">+</button></div></div><b>${money(x.p.price*x.quantity)}</b></div>`).join('')}
function change(id,n){const line=cart.find(x=>x.productId===id);line.quantity+=n;if(line.quantity<1)cart=cart.filter(x=>x.productId!==id);save()}window.change=change;
const openCart=()=>{$('#cart').classList.add('open');$('#overlay').classList.add('open')};const closeCart=()=>{$('#cart').classList.remove('open');$('#overlay').classList.remove('open')};$('.cart-toggle').onclick=e=>{e.preventDefault();openCart()};$('#close-cart').onclick=closeCart;$('#overlay').onclick=closeCart;
$('#checkout-button').onclick=()=>{if(!cart.length)return;closeCart();$('#checkout-dialog').showModal()};$('.dialog-close').onclick=()=>$('#checkout-dialog').close();
$("#order-form").onsubmit = async e => {
  e.preventDefault();

  if (!cart.length) return;

  const button = e.target.querySelector("button");
  button.disabled = true;
  button.textContent = "Opening payment...";

  try {
    const total = cart.reduce((sum, x) => {
      const p = products.find(p => p.id === x.productId);
      return sum + p.price * x.quantity;
    }, 0);

    // Create Razorpay order
    const orderRes = await fetch("/api/payment/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total })
    });

    const order = await orderRes.json();

    if (!orderRes.ok) {
      throw new Error(order.error || "Unable to create payment order");
    }

    const form = new FormData(e.target);

    const options = {
      key: order.key_id || order.key,
      amount: order.amount,
      currency: order.currency || "INR",
      name: "Mahesh Marketing",
      description: "Mahesh Marketing Order",
      order_id: order.id,

      prefill: {
        name: form.get("name"),
        contact: form.get("phone"),
        email: form.get("email") || ""
      },

      theme: {
        color: "#111111"
      },

      handler: async function (response) {
        button.textContent = "Confirming order...";

        const r = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            customer: {
              name: form.get("name"),
              phone: form.get("phone"),
              email: form.get("email"),
              address: form.get("address"),
              notes: form.get("notes")
            },
            items: cart,

            payment: {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }
          })
        });

        const data = await r.json();

        if (!r.ok) {
          throw new Error(data.error || "Order could not be saved");
        }

        $("#form-message").textContent =
          `Payment successful! Your order reference is ${data.orderId || data.id || ""}.`;

        cart = [];
        save();
        renderCart();
        e.target.reset();
      },

      modal: {
        ondismiss: function () {
          button.disabled = false;
          button.textContent = "Send order request";
        }
      }
    };

    const razorpay = new Razorpay(options);
    razorpay.open();

  } catch (err) {
    $("#form-message").textContent = err.message;
    button.disabled = false;
    button.textContent = "Send order request";
  }
};
$('#year').textContent=new Date().getFullYear();load().catch(()=>$('#products-grid').innerHTML='<p>Unable to load products. Please refresh the page.</p>');
