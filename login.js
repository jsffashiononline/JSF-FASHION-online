import {auth} from "../js/firebase.js";
import {signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
document.querySelector("#login").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await signInWithEmailAndPassword(auth,f.get("email"),f.get("password"));location.href="dashboard.html";}catch(err){document.querySelector("#error").textContent="লগইন হয়নি: "+err.message;}};
