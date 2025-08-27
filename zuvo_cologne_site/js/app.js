
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const state = { products: [], cart: JSON.parse(localStorage.getItem('cart')||'[]') };

function saveCart(){ localStorage.setItem('cart', JSON.stringify(state.cart)); updateCartLink(); }
function addToCart(id, qty=1){
  const item = state.cart.find(i => i.id===id);
  if(item){ item.qty += qty; } else { state.cart.push({id, qty}); }
  saveCart();
}
function removeFromCart(id){ state.cart = state.cart.filter(i=>i.id!==id); saveCart(); }
function setQty(id, qty){ const item = state.cart.find(i=>i.id===id); if(item){ item.qty = Math.max(1, qty|0); saveCart(); } }
function cartCount(){ return state.cart.reduce((n,i)=>n+i.qty,0); }
function getProduct(id){ return state.products.find(p=>p.id===id); }
function format(n){ return n.toFixed(2); }
function updateCartLink(){ const el = $('#cart-link'); if(el){ el.textContent = `Cart (${cartCount()})`; } }
function setYear(){ const y = $('#year'); if(y) y.textContent = new Date().getFullYear(); }

async function loadProducts(){
  const res = await fetch('products.json'); state.products = await res.json();
}

function productCard(p){
  return `<div class="card product">
      <img src="${p.image}" alt="${p.name}" loading="lazy">
      <div class="body">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${p.name}</strong> ${p.badge?`<span class="badge">${p.badge}</span>`:''}
        </div>
        <div class="muted">${p.size} • ${p.gender}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <div class="price">$${format(p.price)}</div>
          <div style="display:flex;gap:8px">
            <a class="btn ghost" href="product.html?id=${p.id}">View</a>
            <button class="btn" onclick="addToCart('${p.id}',1)">Add</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderFeatured(){
  const wrap = $('#featured'); if(!wrap) return;
  const list = state.products.slice(0,4).map(productCard).join('');
  wrap.innerHTML = list;
}

function renderShop(){
  const grid = $('#shop-grid'); if(!grid) return;
  const q = $('#search').value.toLowerCase();
  const g = $('#filter-gender').value;
  const sort = $('#sort').value;
  const max = parseFloat($('#max-price').value||Infinity);

  let items = state.products.filter(p => 
    (p.name.toLowerCase().includes(q) || p.notes.some(n => n.toLowerCase().includes(q))) &&
    (!g || p.gender===g) &&
    (p.price <= max)
  );
  if(sort==='price-asc') items.sort((a,b)=>a.price-b.price);
  if(sort==='price-desc') items.sort((a,b)=>b.price-a.price);
  if(sort==='rating-desc') items.sort((a,b)=>b.rating-a.rating);
  grid.innerHTML = items.map(productCard).join('') || '<p class="muted">No products match your filters.</p>';
}

function initShopControls(){
  ['search','filter-gender','sort','max-price'].forEach(id => {
    const el = document.getElementById(id); if(el) el.addEventListener('input', renderShop);
  });
}

function renderProductPage(){
  const root = $('#product'); if(!root) return;
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const p = getProduct(id);
  if(!p){ root.innerHTML = '<p>Product not found.</p>'; return; }

  root.innerHTML = `
    <div class="grid" style="grid-template-columns:1fr 1fr; gap:24px">
      <img src="${p.image}" alt="${p.name}" style="width:100%;border-radius:16px;border:1px solid var(--line)">
      <div>
        <div class="kicker">Eau de Parfum • ${p.size}</div>
        <h1 style="margin:4px 0 8px">${p.name}</h1>
        <div class="badge">Rating ${p.rating}★</div>
        <p style="margin:10px 0">${p.description}</p>
        <p class="muted">Notes: ${p.notes.join(', ')}</p>
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px">
          <div class="price" style="font-size:24px">$${format(p.price)}</div>
          <button class="btn" onclick="addToCart('${p.id}',1)">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
}

function renderCart(){
  const body = $('#cart-table tbody'); if(!body) return;
  let subtotal = 0;
  body.innerHTML = state.cart.map(item => {
    const p = getProduct(item.id); if(!p) return '';
    const total = p.price * item.qty; subtotal += total;
    return `<tr>
      <td style="display:flex;gap:10px;align-items:center">
        <img src="${p.image}" alt="${p.name}" style="width:64px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--line)">
        <div><strong>${p.name}</strong><div class="muted">${p.size}</div></div>
      </td>
      <td>$${format(p.price)}</td>
      <td>
        <input type="number" min="1" value="${item.qty}" style="width:70px" 
               onchange="setQty('${p.id}', this.value); renderCart();">
      </td>
      <td>$${format(total)}</td>
      <td><button class="btn ghost" onclick="removeFromCart('${p.id}'); renderCart();">Remove</button></td>
    </tr>`;
  }).join('');
  $('#subtotal').textContent = format(subtotal);
  $('#cart-count').textContent = `${cartCount()} item${cartCount()!==1?'s':''}`;
}

function initCheckout(){
  const btn = $('#checkout'); if(!btn) return;
  btn.addEventListener('click', () => {
    if(!state.cart.length){ alert('Your cart is empty.'); return; }
    const lines = state.cart.map(i => {
      const p = getProduct(i.id); return `${p.name} x${i.qty} — $${format(p.price*i.qty)}`;
    });
    const subtotal = state.cart.reduce((sum,i)=>sum+getProduct(i.id).price*i.qty,0);
    const message = encodeURIComponent(`Order Request:%0A${lines.join('%0A')}%0ASubtotal: $${format(subtotal)}%0AName:%0APhone/WhatsApp:%0AAddress:`);
    // WhatsApp checkout fallback to email
    const phone = '855000000000'; // TODO: replace with your WhatsApp number in international format
    const wa = `https://wa.me/${phone}?text=${message}`;
    const useWa = confirm('Use WhatsApp to submit your order? Click Cancel to send via Email.');
    if(useWa){ window.open(wa,'_blank'); }
    else{ window.location.href = `mailto:orders@example.com?subject=Order%20Request&body=${message}`; }
  });
}

function initContact(){
  const emailBtn = $('#send-email'); if(!emailBtn) return;
  emailBtn.addEventListener('click', () => {
    const name = $('#c-name').value, email=$('#c-email').value, msg=$('#c-msg').value;
    const body = encodeURIComponent(`Name: ${name}%0AEmail: ${email}%0A%0A${msg}`);
    window.location.href = `mailto:hello@example.com?subject=Contact%20from%20Site&body=${body}`;
  });
  const waBtn = $('#send-whatsapp');
  waBtn.addEventListener('click', () => {
    const name = $('#c-name').value, email=$('#c-email').value, msg=$('#c-msg').value;
    const body = encodeURIComponent(`Contact Request:%0AName: ${name}%0AEmail: ${email}%0A%0A${msg}`);
    const phone = '855000000000'; // TODO: replace with your WhatsApp number
    window.open(`https://wa.me/${phone}?text=${body}`,'_blank');
  });
}

async function init(){
  setYear(); updateCartLink();
  await loadProducts();
  renderFeatured(); initShopControls(); renderShop(); renderProductPage(); renderCart(); initCheckout(); initContact();
}
document.addEventListener('DOMContentLoaded', init);
