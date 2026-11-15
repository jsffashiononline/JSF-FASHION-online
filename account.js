(() => {
  "use strict";
  const auth = window.firebase?.auth?.();
  const db = window.db;
  const $ = id => document.getElementById(id);
  if (!auth || !db) {
    $("account-auth").innerHTML = '<section class="account-panel"><h2>Connection unavailable</h2><p>Firebase connection পাওয়া যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।</p></section>';
    return;
  }
  const message = (id, text, error = true) => { const el=$(id); if(el){el.textContent=text;el.style.color=error?"#9b2c2c":"#187344";} };
  const friendly = error => ({
    "auth/email-already-in-use":"এই Email দিয়ে আগে Account খোলা হয়েছে।",
    "auth/invalid-email":"সঠিক Email Address দিন।",
    "auth/weak-password":"Password কমপক্ষে ৬ অক্ষরের হতে হবে।",
    "auth/invalid-credential":"Email অথবা Password সঠিক নয়।",
    "auth/too-many-requests":"অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    "auth/network-request-failed":"Internet connection পরীক্ষা করুন।"
  }[error.code] || error.message || "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।");
  $("account-login").addEventListener("submit", async event => {
    event.preventDefault(); message("login-message","Login হচ্ছে...",false);
    try { await auth.signInWithEmailAndPassword($("login-email").value.trim(),$("login-password").value); }
    catch(error){ message("login-message",friendly(error)); }
  });
  $("account-register").addEventListener("submit", async event => {
    event.preventDefault(); message("register-message","Account তৈরি হচ্ছে...",false);
    const name=$("register-name").value.trim(), phone=$("register-phone").value.trim();
    try {
      const credential=await auth.createUserWithEmailAndPassword($("register-email").value.trim(),$("register-password").value);
      await credential.user.updateProfile({displayName:name});
      await db.ref("customerProfiles/"+credential.user.uid).set({name,phone,address:"",email:credential.user.email,updatedAt:Date.now()});
    } catch(error){ message("register-message",friendly(error)); }
  });
  $("reset-password").addEventListener("click", async () => {
    const email=$("login-email").value.trim();
    if(!email){message("login-message","আগে Email লিখুন।");return;}
    try{await auth.sendPasswordResetEmail(email);message("login-message","Password reset link আপনার Email-এ পাঠানো হয়েছে।",false);}
    catch(error){message("login-message",friendly(error));}
  });
  $("account-profile").addEventListener("submit", async event => {
    event.preventDefault(); const user=auth.currentUser;if(!user)return;
    try {
      const profile={name:$("profile-name").value.trim(),phone:$("profile-phone").value.trim(),address:$("profile-address").value.trim(),email:user.email,updatedAt:Date.now()};
      await db.ref("customerProfiles/"+user.uid).update(profile);
      await user.updateProfile({displayName:profile.name});
      message("profile-message","প্রোফাইল আপডেট হয়েছে।",false);
    } catch(error){message("profile-message",friendly(error));}
  });
  $("account-logout").addEventListener("click",()=>auth.signOut());
  let orderListener=null;
  auth.onAuthStateChanged(async user => {
    $("account-auth").classList.toggle("account-hidden",!!user);
    $("account-dashboard").classList.toggle("account-hidden",!user);
    if(orderListener){orderListener.off();orderListener=null;}
    if(!user)return;
    $("profile-email").textContent=user.email||"";
    try{
      const snap=await db.ref("customerProfiles/"+user.uid).once("value");
      const profile=snap.val()||{};
      $("profile-name").value=profile.name||user.displayName||"";
      $("profile-phone").value=profile.phone||"";
      $("profile-address").value=profile.address||"";
    }catch(error){message("profile-message","প্রোফাইল লোড করা যায়নি: "+friendly(error));}
    const ordersRef=db.ref("userOrders/"+user.uid).orderByChild("createdAt");
    orderListener=ordersRef;
    ordersRef.on("value",snapshot=>{
      const entries=[];snapshot.forEach(child=>entries.push({id:child.key,...(child.val()||{})}));
      entries.sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
      $("account-orders").innerHTML=entries.length?entries.map(order=>'<article class="account-order"><strong>Order #'+escapeHtml(order.orderCode||order.id.slice(-8).toUpperCase())+'</strong><p>'+new Date(Number(order.createdAt||0)).toLocaleString()+' · ৳'+Number(order.total||0).toLocaleString("en-BD")+'</p><span class="account-status">'+escapeHtml(order.status||"Pending")+'</span></article>').join(""):'<p class="account-note">এখনো কোনো অর্ডার পাওয়া যায়নি।</p>';
    },error=>{$("account-orders").textContent="অর্ডার লোড করা যায়নি: "+friendly(error);});
  });
  function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
})();