export const money = n => Number(n||0).toLocaleString("en-BD");
export const getCart = () => JSON.parse(localStorage.getItem("jsf-cart")||"[]");
export const saveCart = c => localStorage.setItem("jsf-cart",JSON.stringify(c));
export const cartCount = () => document.querySelectorAll("#cartCount").forEach(x=>x.textContent=getCart().reduce((a,b)=>a+Number(b.qty||1),0));
export const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
