/* ============================================================================
   Authentication: registration + login
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const msg = document.getElementById("auth-msg");

  function showTab(name) {
    const isLogin = name === "login";
    tabLogin.classList.toggle("active", isLogin);
    tabRegister.classList.toggle("active", !isLogin);
    formLogin.style.display = isLogin ? "block" : "none";
    formRegister.style.display = isLogin ? "none" : "block";
    msg.className = "form-msg";
    msg.textContent = "";
  }

  tabLogin.addEventListener("click", () => showTab("login"));
  tabRegister.addEventListener("click", () => showTab("register"));

  function showMsg(text, type = "err") {
    msg.textContent = text;
    msg.className = `form-msg show ${type}`;
  }

  function friendlyError(error) {
    const code = String(error?.code || "");
    const map = {
      "auth/email-already-in-use": "هذا البريد الإلكتروني مستخدم بالفعل. جرّب تسجيل الدخول.",
      "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
      "auth/weak-password": "كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.",
      "auth/missing-password": "اكتب كلمة المرور.",
      "auth/user-not-found": "لا يوجد حساب بهذا البريد الإلكتروني.",
      "auth/wrong-password": "كلمة المرور غير صحيحة.",
      "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      "auth/too-many-requests": "تم إيقاف المحاولات مؤقتًا لكثرة المحاولات. حاول بعد قليل.",
      "auth/operation-not-allowed": "تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في Firebase Authentication.",
      "auth/invalid-api-key": "مفتاح Firebase غير صحيح. راجع firebase-config.js.",
      "auth/api-key-not-valid.-please-pass-a-valid-api-key": "مفتاح Firebase غير صحيح. راجع firebase-config.js.",
      "auth/app-not-authorized": "الدومين الحالي غير مضاف إلى Authorized domains في Firebase Authentication.",
      "auth/network-request-failed": "تعذر الاتصال بـ Firebase. تحقق من الإنترنت وحاول مرة أخرى.",
      "auth/internal-error": "حدث خطأ داخلي في Firebase. راجع إعدادات المشروع ثم حاول مرة أخرى."
    };

    if (map[code]) return map[code];
    if (code.includes("invalid-api-key")) return "مفتاح Firebase غير صحيح. راجع firebase-config.js.";
    if (code.includes("app-not-authorized")) return "الدومين الحالي غير مضاف إلى Authorized domains في Firebase Authentication.";
    return `تعذر تنفيذ العملية (${code || "unknown"}). افتح Console لمعرفة الخطأ التفصيلي.`;
  }

  function validateCommon(name, phone, email, password) {
    if (!name || !phone || !email || !password) {
      showMsg("من فضلك أكمل جميع البيانات المطلوبة.");
      return false;
    }
    if (name.length < 2) {
      showMsg("اكتب الاسم بالكامل بشكل صحيح.");
      return false;
    }
    if (!/^01[0125][0-9]{8}$/.test(phone)) {
      showMsg("رقم الهاتف يجب أن يكون رقمًا مصريًا من 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015.");
      return false;
    }
    if (password.length < 6) {
      showMsg("كلمة المرور يجب ألا تقل عن 6 أحرف.");
      return false;
    }
    return true;
  }

  formRegister.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.className = "form-msg";

    if (!FIREBASE_CONFIG_READY) {
      showMsg("Firebase غير مهيأ. افتح firebase-config.js وضع بيانات مشروع Firebase الحقيقية.");
      return;
    }

    const name = document.getElementById("reg-name").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const password = document.getElementById("reg-password").value;
    const btn = formRegister.querySelector('button[type="submit"]');

    if (!validateCommon(name, phone, email, password)) return;

    btn.disabled = true;
    btn.textContent = "جاري إنشاء الحساب...";

    try {
      const credential = await auth.createUserWithEmailAndPassword(email, password);
      const user = credential.user;

      await user.updateProfile({ displayName: name });

      // Create the profile before redirecting to booking.
      await db.collection("users").doc(user.uid).set({
        uid: user.uid,
        name,
        phone,
        email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      showMsg("تم إنشاء الحساب بنجاح. جاري فتح صفحة الحجز...", "ok");
      const params = new URLSearchParams(location.search);
      const next = params.get("next") || "booking.html";
      setTimeout(() => location.replace(next), 500);
    } catch (error) {
      console.error("Registration error:", error);
      showMsg(friendlyError(error));
    } finally {
      btn.disabled = false;
      btn.textContent = "إنشاء الحساب";
    }
  });

  formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.className = "form-msg";

    if (!FIREBASE_CONFIG_READY) {
      showMsg("Firebase غير مهيأ. افتح firebase-config.js وضع بيانات مشروع Firebase الحقيقية.");
      return;
    }

    const email = document.getElementById("log-email").value.trim().toLowerCase();
    const password = document.getElementById("log-password").value;
    const btn = formLogin.querySelector('button[type="submit"]');

    if (!email || !password) {
      showMsg("اكتب البريد الإلكتروني وكلمة المرور.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "جاري الدخول...";

    try {
      await auth.signInWithEmailAndPassword(email, password);
      showMsg("تم تسجيل الدخول بنجاح. جاري التحويل...", "ok");
      const params = new URLSearchParams(location.search);
      const next = params.get("next") || "booking.html";
      setTimeout(() => location.replace(next), 400);
    } catch (error) {
      console.error("Login error:", error);
      showMsg(friendlyError(error));
    } finally {
      btn.disabled = false;
      btn.textContent = "دخول";
    }
  });
});
