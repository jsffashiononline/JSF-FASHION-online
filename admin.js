const ADMIN_UID="MYGho0eVmHMWPV9n9GFSmO3XvC62";
const $=id=>document.getElementById(id), safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"৳"+Number(n||0).toLocaleString("en-BD");
let products={},orders={},editing=null;
if(firebaseConfig.apiKey.startsWith("PASTE_")) $("loginMessage").textContent="আগে firebase-config.js ফাইলে Firebase Web App config বসান।";
$("loginForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await firebase.auth().signInWithEmailAndPassword(f.get("email"),f.get("password"));}catch(err){$("loginMessage").textContent="লগইন হয়নি: "+err.message;}};
$("logoutBtn").onclick=()=>firebase.auth().signOut();
firebase.auth().onAuthStateChanged(user=>{
 const allowed=!!user&&user.uid===ADMIN_UID;
 $("loginPanel").hidden=allowed;$("dashboard").hidden=!allowed;
 if(user&&!allowed){$("loginMessage").textContent="এই অ্যাকাউন্টের Admin access নেই।";firebase.auth().signOut();return;}
 if(allowed)startDashboard();
});
function startDashboard(){
 db.ref("products").on("value",s=>{products=s.val()||{};renderProducts();});
 db.ref("orders").on("value",s=>{orders=s.val()||{};renderOrders();});
 db.ref("settings").on("value",s=>{const v=s.val()||{},f=$("settingsForm");f.bkash.value=v.bkash||"";f.nagad.value=v.nagad||"";f.profileImage.value=v.profileImage||"";preview(v.profileImage);});
}
function renderProducts(){
 $("productStat").textContent=Object.keys(products).length;
 $("adminProducts").innerHTML=Object.entries(products).map(([id,p])=>`<div class="admin-row"><div><b>${safe(p.name)}</b><small>${money(p.price)} · ${safe(p.category||"")}</small></div><div><button class="mini-btn edit" data-id="${safe(id)}">Edit</button><button class="mini-btn danger delete" data-id="${safe(id)}">Delete</button></div></div>`).join("")||'<p class="muted">No products yet.</p>';
 document.querySelectorAll(".edit").forEach(b=>b.onclick=()=>editProduct(b.dataset.id));
 document.querySelectorAll(".delete").forEach(b=>b.onclick=async()=>{if(confirm("এই প্রোডাক্ট ডিলিট করবেন?"))await db.ref("products/"+b.dataset.id).remove();});
}
function editProduct(id){const p=products[id],f=$("productForm");editing=id;f.name.value=p.name||"";f.description.value=p.description||"";f.price.value=p.price||"";f.category.value=p.category||"";f.image.value=p.image||"";f.sizes.value=p.sizes||"";$("productFormTitle").textContent="Edit Product";$("cancelEdit").hidden=false;window.scrollTo({top:0,behavior:"smooth"});}
$("cancelEdit").onclick=()=>{editing=null;$("productForm").reset();$("productFormTitle").textContent="Add Product";$("cancelEdit").hidden=true;};
$("productForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),p={name:f.get("name"),description:f.get("description"),price:Number(f.get("price")),category:f.get("category")||"General",image:f.get("image"),sizes:f.get("sizes"),updatedAt:firebase.database.ServerValue.TIMESTAMP};try{if(editing)await db.ref("products/"+editing).update(p);else await db.ref("products").push({...p,createdAt:firebase.database.ServerValue.TIMESTAMP});$("cancelEdit").click();alert("Product saved.");}catch(err){alert("Save failed: "+err.message);}};
$("settingsForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await db.ref("settings").update({bkash:f.get("bkash"),nagad:f.get("nagad"),profileImage:f.get("profileImage")});alert("Settings saved.");}catch(err){alert("Settings save failed: "+err.message);}};
function preview(url){$("settingsPreview").innerHTML=url?`<img src="${safe(url)}" alt="Store profile preview">`:"";}
function renderOrders(){
 $("orderStat").textContent=Object.keys(orders).length;
 $("adminOrders").innerHTML=Object.entries(orders).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0)).map(([id,o])=>`<article class="order-card"><div class="order-head"><div><b>${safe(o.customer?.name||"Customer")}</b><small>${safe(o.customer?.phone||"")} · ${safe(o.customer?.address||"")}</small></div><strong>${money(o.total)}</strong></div><p>${(o.items||[]).map(i=>`${safe(i.name)} × ${i.quantity}`).join(" · ")}</p><div class="order-actions"><select data-id="${safe(id)}" class="status-select">${["Pending","Confirmed","Processing","Shipped","Delivered","Cancelled"].map(x=>`<option ${o.status===x?"selected":""}>${x}</option>`).join("")}</select><button class="mini-btn danger delete-order" data-id="${safe(id)}">Delete</button></div></article>`).join("")||'<p class="muted">No orders yet.</p>';
 document.querySelectorAll(".status-select").forEach(s=>s.onchange=()=>db.ref("orders/"+s.dataset.id+"/status").set(s.value));
 document.querySelectorAll(".delete-order").forEach(b=>b.onclick=async()=>{if(confirm("এই অর্ডার ডিলিট করবেন?"))await db.ref("orders/"+b.dataset.id).remove();});
}
