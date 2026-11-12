const ADMIN_UID = "MYGho0eVmHMWPV9n9GFSmO3XvC62";
const grid = document.getElementById("productGrid");
let products = {}, cart = JSON.parse(localStorage.getItem("jsf_cart") || "{}"), category = "All";
const money = n => "৳" + Number(n || 0).toLocaleString("en-BD");
const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
if (firebaseConfig.apiKey.startsWith("PASTE_")) grid.innerHTML = '<p class="notice">প্রথমে firebase-config.js ফাইলে Firebase Web App config বসান।</p>';
else {
  db.ref("products").on("value", snap => { products = snap.val() || {}; renderProducts(); });
  db.ref("settings").on("value", snap => { const s=snap.val()||{}; if(s.profileImage) document.querySelector(".brand-mark").style.backgroundImage=`url("${s.profileImage}")`; });
}
function renderProducts(){
 const list=Object.entries(products).filter(([id,p]) => p && (category==="All" || p.category===category));
 const q=(document.getElementById("searchInput").value||"").toLowerCase();
 const filtered=list.filter(([id,p]) => (p.name||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q));
 const cats=["All",...new Set(Object.values(products).map(p=>p.category).filter(Boolean))];
 document.getElementById("categoryBar").innerHTML=cats.map(c=>`<button data-category="${safe(c)}" class="${c===category?"active":""}">${safe(c)}</button>`).join("");
 document.getElementById("categoryBar").querySelectorAll("button").forEach(b=>b.onclick=()=>{category=b.dataset.category;renderProducts();});
 grid.innerHTML=filtered.length?filtered.map(([id,p])=>`<article class="product-card"><div class="product-image">${p.image?`<img src="${safe(p.image)}" alt="${safe(p.name)}" loading="lazy">`:'<span>JSF</span>'}</div><div class="product-info"><small>${safe(p.category||"COLLECTION")}</small><h3>${safe(p.name)}</h3><p>${safe(p.description||"")}</p><div class="product-bottom"><b>${money(p.price)}</b><button class="add-button" data-id="${safe(id)}">ADD +</button></div></div></article>`).join(""):'<p class="muted">কোনো প্রোডাক্ট পাওয়া যায়নি।</p>';
 grid.querySelectorAll(".add-button").forEach(b=>b.onclick=()=>{cart[b.dataset.id]=(cart[b.dataset.id]||0)+1;saveCart();});
}
document.getElementById("searchInput").addEventListener("input",renderProducts);
function saveCart(){localStorage.setItem("jsf_cart",JSON.stringify(cart));renderCart();}
function renderCart(){
 const entries=Object.entries(cart).filter(([id,n])=>products[id]&&n>0);let total=0,count=0;
 document.getElementById("cartItems").innerHTML=entries.map(([id,n])=>{const p=products[id],sub=Number(p.price)*n;total+=sub;count+=n;return `<div class="cart-line"><div><b>${safe(p.name)}</b><small>${money(p.price)} × ${n}</small></div><div><b>${money(sub)}</b><button class="remove-item" data-id="${safe(id)}">−</button><button class="plus-item" data-id="${safe(id)}">+</button></div></div>`;}).join("")||'<p class="muted">আপনার কার্ট খালি।</p>';
 document.getElementById("cartCount").textContent=count;document.getElementById("cartTotal").textContent=money(total);
 document.querySelectorAll(".remove-item").forEach(b=>b.onclick=()=>{cart[b.dataset.id]--;if(cart[b.dataset.id]<=0)delete cart[b.dataset.id];saveCart();});
 document.querySelectorAll(".plus-item").forEach(b=>b.onclick=()=>{cart[b.dataset.id]++;saveCart();});
}
renderCart();
const drawer=document.getElementById("cartDrawer"),overlay=document.getElementById("cartOverlay");
function openCart(){drawer.classList.add("open");overlay.classList.add("show");}function closeCart(){drawer.classList.remove("open");overlay.classList.remove("show");}
document.getElementById("openCart").onclick=openCart;document.getElementById("closeCart").onclick=closeCart;overlay.onclick=closeCart;
document.getElementById("checkoutForm").onsubmit=async e=>{
 e.preventDefault();const entries=Object.entries(cart).filter(([id,n])=>products[id]&&n>0);if(!entries.length)return alert("কার্টে প্রোডাক্ট যোগ করুন।");
 const f=new FormData(e.target),items=entries.map(([id,n])=>({productId:id,name:products[id].name,price:Number(products[id].price),quantity:n}));
 const total=items.reduce((s,x)=>s+x.price*x.quantity,0);
 const order={customer:{name:f.get("name"),phone:f.get("phone"),address:f.get("address")},items,total,status:"Pending",createdAt:firebase.database.ServerValue.TIMESTAMP};
 try{await db.ref("orders").push(order);cart={};saveCart();e.target.reset();closeCart();alert("আপনার অর্ডার গ্রহণ করা হয়েছে। ধন্যবাদ!");}
 catch(err){alert("অর্ডার পাঠানো যায়নি। Firebase সেটআপ ও Database Rules পরীক্ষা করুন।");console.error(err);}
};
