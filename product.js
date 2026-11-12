import {db} from "./firebase.js";
import {ref,get} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import {getCart,saveCart,money,esc,cartCount} from "./common.js";
const id=new URLSearchParams(location.search).get("id"),root=document.querySelector("#productView");
const snap=await get(ref(db,"products/"+id));const p=snap.val();
if(!p){root.textContent="পণ্যটি পাওয়া যায়নি।";}else{root.innerHTML=`<div class="admin-grid"><img style="width:100%;max-height:550px;object-fit:contain" src="${esc(p.image||'assets/logo-placeholder.svg')}"><div><p class="eyebrow">JSF COLLECTION</p><h1>${esc(p.name)}</h1><h2>৳${money(p.price)}</h2><p>${esc(p.description||"")}</p><label>পরিমাণ<input id="qty" type="number" min="1" value="1"></label><button id="add" class="btn">কার্টে যোগ করুন</button></div></div>`;document.querySelector("#add").onclick=()=>{let c=getCart(),q=Math.max(1,Number(document.querySelector("#qty").value)||1),old=c.find(x=>x.id===id);old?old.qty+=q:c.push({id,name:p.name,price:Number(p.price),image:p.image||"",qty:q});saveCart(c);cartCount();alert("কার্টে যোগ হয়েছে");};}
