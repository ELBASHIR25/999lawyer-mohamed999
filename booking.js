/* ============================================================================
   Booking: Firebase Auth + Firestore transaction.
   slotLocks is the source of truth for whether a slot is already taken.
   ============================================================================ */

const SLOTS = [
  "10:00 ص", "11:00 ص", "12:00 م", "01:00 م", "02:00 م",
  "04:00 م", "05:00 م", "06:00 م", "07:00 م"
];

let currentUser = null;
let selectedSlot = null;
let currentDateRequest = 0;

function slotId(dateStr, slot) {
  const digits = slot.replace(/[^0-9]/g, "");
  const period = slot.includes("م") ? "pm" : "am";
  return `${dateStr}__${digits}${period}`;
}

function bookingErrorMessage(error) {
  const code = String(error?.code || "");
  if (code === "slot-already-booked") return "هذا الميعاد حُجز للتو من شخص آخر. اختر ميعادًا آخر.";
  if (code === "permission-denied") return "ليست لديك صلاحية لإتمام الحجز. تأكد من نشر firestore.rules الصحيحة.";
  if (code === "failed-precondition") return "قاعدة Firestore غير مهيأة أو الطلب يحتاج إعدادًا إضافيًا. تأكد من إنشاء Firestore Database.";
  if (code === "unavailable") return "خدمة Firebase غير متاحة مؤقتًا. تحقق من الإنترنت وحاول مرة أخرى.";
  if (code === "unauthenticated") return "انتهت جلسة الدخول. سجّل الدخول مرة أخرى.";
  return `حدث خطأ أثناء الحجز (${code || "unknown"}). افتح Console لمعرفة التفاصيل.`;
}

function todayISO() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");
}

function setBookingMessage(text, type = "err") {
  const msg = document.getElementById("booking-msg");
  msg.textContent = text;
  msg.className = `form-msg show ${type}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!FIREBASE_CONFIG_READY) {
    setBookingMessage("Firebase غير مهيأ. عدّل firebase-config.js قبل استخدام الحجز.");
    return;
  }

  try {
    currentUser = await requireAuth("auth.html?next=booking.html");
  } catch (error) {
    console.error("Auth guard error:", error);
    setBookingMessage("تعذر التحقق من تسجيل الدخول. حاول تحديث الصفحة.");
    return;
  }

  document.getElementById("who-name").textContent = currentUser.displayName || currentUser.email || "العميل";
  document.getElementById("book-name").value = currentUser.displayName || "";
  document.getElementById("book-email").value = currentUser.email || "";

  const dateInput = document.getElementById("book-date");
  const today = todayISO();
  dateInput.min = today;
  dateInput.value = today;

  await renderSlots(today);
  dateInput.addEventListener("change", () => renderSlots(dateInput.value));
  document.getElementById("form-booking").addEventListener("submit", submitBooking);
});

async function renderSlots(dateStr) {
  const grid = document.getElementById("slot-grid");
  const requestId = ++currentDateRequest;
  grid.innerHTML = "<div class=\"hint\">جاري تحميل المواعيد...</div>";
  selectedSlot = null;

  if (!dateStr) {
    grid.innerHTML = "<div class=\"hint\">اختر التاريخ أولًا.</div>";
    return;
  }

  try {
    const snapshot = await db.collection("slotLocks").where("date", "==", dateStr).get();
    if (requestId !== currentDateRequest) return;

    const taken = new Set();
    snapshot.forEach(doc => taken.add(doc.data().slot));

    grid.innerHTML = "";
    SLOTS.forEach(slot => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.textContent = taken.has(slot) ? `${slot} — محجوز` : slot;

      if (taken.has(slot)) {
        button.disabled = true;
        button.title = "محجوز";
      } else {
        button.addEventListener("click", () => {
          document.querySelectorAll(".slot.selected").forEach(el => el.classList.remove("selected"));
          button.classList.add("selected");
          selectedSlot = slot;
          document.getElementById("booking-msg").className = "form-msg";
          document.getElementById("booking-msg").textContent = "";
        });
      }
      grid.appendChild(button);
    });
  } catch (error) {
    console.error("Loading slots failed:", error);
    grid.innerHTML = "<div class=\"form-msg show err\">تعذر تحميل المواعيد من Firebase. تأكد من نشر قواعد Firestore ومن اتصال الإنترنت.</div>";
  }
}

async function submitBooking(event) {
  event.preventDefault();

  if (!currentUser) {
    setBookingMessage("سجّل الدخول أولًا.");
    return;
  }

  if (!selectedSlot) {
    setBookingMessage("من فضلك اختر ميعادًا متاحًا.");
    return;
  }

  const form = event.target;
  const date = document.getElementById("book-date").value;
  const phone = document.getElementById("book-phone").value.trim();
  const service = document.getElementById("book-service").value;
  const notes = document.getElementById("book-notes").value.trim();
  const name = document.getElementById("book-name").value.trim() || currentUser.displayName || "";
  const email = currentUser.email || document.getElementById("book-email").value.trim();

  if (!/^01[0125][0-9]{8}$/.test(phone)) {
    setBookingMessage("رقم الهاتف يجب أن يكون رقمًا مصريًا من 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015.");
    return;
  }

  if (!name || !email || !date || !service) {
    setBookingMessage("أكمل بيانات الحجز المطلوبة.");
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    setBookingMessage("التاريخ غير صحيح.");
    return;
  }

  const chosenDate = new Date(`${date}T00:00:00`);
  const today = new Date(`${todayISO()}T00:00:00`);
  if (chosenDate < today) {
    setBookingMessage("لا يمكن حجز تاريخ سابق.");
    return;
  }

  const bookingRef = db.collection("bookings").doc();
  const lockRef = db.collection("slotLocks").doc(bookingRef.id);
  const button = form.querySelector('button[type="submit"]');

  button.disabled = true;
  button.textContent = "جاري تأكيد الحجز...";

  try {
    await db.runTransaction(async (transaction) => {
      const lockSnapshot = await transaction.get(lockRef);
      if (lockSnapshot.exists) {
        const error = new Error("Slot already booked");
        error.code = "slot-already-booked";
        throw error;
      }

      const timestamp = firebase.firestore.FieldValue.serverTimestamp();

      transaction.set(lockRef, {
        date,
        slot: selectedSlot,
        bookingId: bookingRef.id,
        uid: currentUser.uid,
        createdAt: timestamp
      });

      transaction.set(bookingRef, {
        uid: currentUser.uid,
        lockId: lockRef.id,
        name: name.slice(0, 120),
        email: email.slice(0, 254),
        phone: phone.slice(0, 20),
        service: service.slice(0, 120),
        date,
        slot: selectedSlot,
        notes: notes.slice(0, 2000),
        status: "جديد",
        createdAt: timestamp
      });
    });

    setBookingMessage("تم تأكيد حجزك بنجاح. سيتواصل معك المكتب لتأكيد الموعد.", "ok");
    
    // إعادة تعيين الحقول الحساسة فقط وحفظ اسم العميل وبريده
    document.getElementById("book-notes").value = "";
    document.getElementById("book-phone").value = "";
    document.getElementById("book-name").value = currentUser.displayName || name;
    document.getElementById("book-email").value = currentUser.email || email;

    await renderSlots(date);
  } catch (error) {
    console.error("Booking error:", error);
    setBookingMessage(bookingErrorMessage(error));
    await renderSlots(date);
  } finally {
    button.disabled = false;
    button.textContent = "تأكيد الحجز";
  }
}
