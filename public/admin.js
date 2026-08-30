const $=s=>document.querySelector(s);let token=sessionStorage.getItem('mm-admin-token'),products=[];const headers=()=>({'Content-Type':'application/json','x-admin-token':token});
async function api(url,options={}){const r=await fetch(url,{...options,headers:{...headers(),...(options.headers||{})}});if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'Request failed')}return r.status===204?null:r.json()}
async function login(){try{await api('/api/admin/login',{method:'POST',body:JSON.stringify({token:$('#token').value})});$('#login').classList.add('hidden');$('#dashboard').classList.remove('hidden');load()}catch(e){sessionStorage.removeItem('mm-admin-token');token=null;$('#login-message').textContent='Incorrect password. Please try again.'}}
async function load(){[products]=await Promise.all([api('/api/products')]);const orders=await api('/api/admin/orders');renderProducts();renderOrders(orders)}
function renderProducts(){$('#admin-products').innerHTML=products.map(p=>`<div class="admin-product"><img src="${p.image||'https://placehold.co/80'}" alt=""><div><b>${p.name}</b><small>${p.category} · ₹${p.price}</small></div><button class="text-button" onclick="editProduct('${p.id}')">Edit</button><button class="text-button" onclick="removeProduct('${p.id}')">Delete</button></div>`).join('')||'<p>No products yet.</p>'}
function renderOrders(orders){$('#orders').innerHTML=orders.map(o=>`<article class="order"><div><b>${o.id} · ₹${o.total}</b><small>${new Date(o.created_at).toLocaleString('en-IN')}</small><p><b>${o.customer.name}</b> ${o.customer.phone}${o.customer.email?' · '+o.customer.email:''}<br>${o.customer.address||'No address added'}<br>Items: ${o.items.map(i=>`${i.name} × ${i.quantity}`).join(', ')}${o.notes?'<br>Note: '+o.notes:''}</p></div><select onchange="updateOrder('${o.id}',this.value)">${['New','Confirmed','Processing','Dispatched','Completed','Cancelled'].map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select></article>`).join('')||'<p>No orders received yet.</p>'}
window.editProduct=id=>{const p=products.find(p=>p.id===id),form=$('#product-form');for(const k of ['id','name','category','price','image','description'])form.elements[k].value=p[k]||'';form.elements.featured.checked=p.featured;$('#form-title').textContent='Edit product';$('#cancel-edit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})};
window.removeProduct=async id=>{if(!confirm('Remove this product from your live catalogue?'))return;try{await api('/api/admin/products/'+id,{method:'DELETE'});load()}catch(e){alert(e.message)}};
window.updateOrder=async(id,status)=>{try{await api('/api/admin/orders/'+id,{method:'PATCH',body:JSON.stringify({status})})}catch(e){alert(e.message);load()}};
$('#login-form').onsubmit=e=>{e.preventDefault();token=$('#token').value;sessionStorage.setItem('mm-admin-token',token);login()};$('#logout').onclick=()=>{sessionStorage.removeItem('mm-admin-token');location.reload()};
$('#product-form').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const id = f.get('id');
  const payload = Object.fromEntries(f);
  payload.price = Number(payload.price);
  payload.featured = f.get('featured') === 'on';
  delete payload.id;

  try {
    await api(`/api/admin/products${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

    $('#product-message').textContent = 'Product saved.';
    $('#product-edit').classList.add('hidden');
    load();
  } catch (err) {
    $('#product-message').textContent = err.message;
  }
};
// ================= EXCEL PRODUCT IMPORT =================

const excelFile = document.querySelector("#excel-file");
const importExcelButton = document.querySelector("#import-excel");
const importMessage = document.querySelector("#import-message");

if (excelFile && importExcelButton) {
  importExcelButton.addEventListener("click", async () => {
    const file = excelFile.files[0];

    if (!file) {
      importMessage.textContent = "Please select an Excel file.";
      return;
    }

    try {
      importExcelButton.disabled = true;
      importExcelButton.textContent = "Importing...";
      importMessage.textContent = "";

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: {
          "x-admin-token": token
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Excel import failed.");
      }

      importMessage.textContent = result.message;
      excelFile.value = "";

      await load();

    } catch (error) {
      console.error("Excel import error:", error);
      importMessage.textContent = "Excel import failed: " + error.message;
    } finally {
      importExcelButton.disabled = false;
      importExcelButton.textContent = "📥 Import Excel Products";
    }
  });
}
