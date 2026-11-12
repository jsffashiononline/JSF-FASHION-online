import {db} from "./firebase.js";
import {ref,push,set,onValue} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import {getCart,saveCart,money} from "./common.js";
const form=document.querySelector("#checkoutForm"),msg=document.querySelector("#message");
onValue(ref(db,"settings"),s=>{const v=s.val()||{};const info=[];if(v.bkash)info.push("bKash: "+v.bkash);if(v.nagad)info.push("Nagad: "+v.nagad);document.querySelector("#paymentInfo").textContent=info.length?"পেমেন্ট নম্বর — "+info.join(" | "):"পেমেন্ট নম্বর জানতে দোকানের সাথে যোগাযোগ করুন।";});
form.onsubmit=async e=>{e.preventDefault();const cart=getCart();if(!cart.length){msg.textContent="আপনার কার্ট খালি।";return;}const f=new FormData(form);const order={customer:{name:f.get("name"),phone:f.get("phone"),address:f.get("address")},payment:f.get("payment"),transactionId:f.get("transactionId"),items:cart,total:cart.reduce((s,p)=>s+p.price*p.qty,0),status:"pending",createdAt:Date.now()};try{const r=push(ref(db,"orders"));await set(r,order);saveCart([]);form.reset();msg.textContent="অর্ডার গ্রহণ করা হয়েছে। অর্ডার আইডি: "+r.key;}catch(err){msg.textContent="অর্ডার পাঠানো যায়নি: "+err.message;}};
