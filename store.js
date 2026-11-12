import {db} from "./firebase.js";
import {ref,onValue} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import {money,cartCount,esc} from "./common.js";
const grid=document.querySelector("#productGrid"),search=document.querySelector("#search");
let products=[];
onValue(ref(db,"products"),snap=>{products=Object.entries(snap.val()||{}).map(([id,p])=>({id,...p})).filter(p=>p.active!==false);render();},e=>grid.textContent="পণ্য লোড হয়নি: "+e.message);
function render(){const q=(search.value||"").toLowerCase();const list=products.filter(p=>(p.name||"").toLowerCase().includes(q));grid.innerHTML=list.length?list.map(p=>`<article class="card"><a href="product.html?id=${encodeURIComponent(p.id)}"><img src="${esc(p.image||'assets/logo-placeholder.svg')}" alt=""><h3>${esc(p.name)}</h3></a><div class="price">৳${money(p.price)}</div><a class="btn" href="product.html?id=${encodeURIComponent(p.id)}">বিস্তারিত</a></article>`).join(""):"কোনো পণ্য পাওয়া যায়নি";}
search.addEventListener("input",render);cartCount();
onValue(ref(db,"settings"),s=>{const v=s.val()||{};document.querySelector("#storeName").textContent="JSF FASHION";document.querySelector("#footerName").textContent="JSF FASHION";if(v.logo)document.querySelector("#storeLogo").src=v.logo;document.querySelector("#footerContact").textContent=[v.bkash&&"bKash: "+v.bkash,v.nagad&&"Nagad: "+v.nagad].filter(Boolean).join(" | ");});
