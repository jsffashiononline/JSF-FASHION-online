(() => {
 const root=document.getElementById("wishlist-products");
 const money=v=>Number(v||0).toLocaleString("en-BD");
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const ids=()=>{try{const a=JSON.parse(localStorage.getItem("jsf_wishlist")||"[]");return Array.isArray(a)?a.map(String):[]}catch(_){return[]}};
 const render=products=>{
  const saved=ids(),list=products.filter(p=>saved.includes(String(p.id)));
  if(!list.length){root.innerHTML='<div class="wishlist-empty"><h2>Your wishlist is empty</h2><p>পছন্দের প্রোডাক্টে ♡ WISHLIST চাপলে এখানে দেখা যাবে।</p><a class="btn" href="index.html#products">EXPLORE PRODUCTS</a></div>';return;}
  root.innerHTML=list.map(p=>'<article class="product-card"><div class="product-media"><img class="product-view-image" src="'+esc(p.images?.[0]||p.image||"")+'" alt="'+esc(p.name)+'"></div><div class="product-info"><h3>'+esc(p.name)+'</h3><p>'+esc(p.category||"Fashion")+'</p><div class="product-price">৳'+money(p.price)+'</div><a class="btn" href="index.html#products">VIEW IN STORE</a><button class="wishlist-remove" type="button" data-remove="'+esc(p.id)+'">REMOVE FROM WISHLIST</button></div></article>').join("");
 };
 root.addEventListener("click",event=>{const b=event.target.closest("[data-remove]");if(!b)return;localStorage.setItem("jsf_wishlist",JSON.stringify(ids().filter(id=>id!==String(b.dataset.remove))));load();});
 async function load(){try{const snap=await window.db.ref("products").once("value"),products=[];snap.forEach(child=>products.push({id:child.key,...(child.val()||{})}));render(products);}catch(error){root.textContent="Wishlist load failed: "+error.message;}}
 load();
})();