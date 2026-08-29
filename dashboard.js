/* ============================================================================
   Office dashboard. UI access is checked client-side, and Firestore rules
   enforce the same authorization server-side.
   ============================================================================ */

let firstBookingLoad = true;
let firstVisitLoad = true;
let clientSet = new Set();
let stopBookingsListener = null;
let stopVisitsListener = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function showDashboardError(text) {
  const root = document.getElementById("dash-root");
  root.innerHTML = `<div class="container"><div class="form-msg show err" style="margin:40px 0">${escapeHtml(text)}</div></div>`;
}

function showToast(title, text) {
  const stack = document.getElementById("live-toast-stack");
  if (!stack) return;
  const element = document.createElement("div");
  element.className = "live-toast";
  element.innerHTML = `<span class="dot"></span><div><b>${escapeHtml(title)}</b><span>${escapeHtml(text)}</span></div>`;
  stack.appendChild(element);
  setTimeout(() => {
    element.style.opacity = "0";
    element.style.transition = "opacity .5s";
    setTimeout(() => element.remove(), 500);
  }, 6000);
}

function renderBookings(snapshot) {
  const list = document.getElementById("bookings-list");
  list.innerHTML = "";
  clientSet = new Set();

  snapshot.forEach(doc => {
    const booking = doc.data();
    if (booking.uid) clientSet.add(booking.uid);

    const row = document.createElement("div");
    row.className = "row-item";
    row.innerHTML = `
      <div>
        <b>${escapeHtml(booking.name || "بدون اسم")}</b>
        <span>${escapeHtml(booking.phone || "")} — ${escapeHtml(booking.service || "")} — ${escapeHtml(booking.date || "")} ${escapeHtml(booking.slot || "")}</span>
      </div>
      <span class="tag new">${escapeHtml(booking.status || "جديد")}</span>`;
    list.appendChild(row);
  });

  if (snapshot.empty) list.innerHTML = '<p class="empty-note">لا توجد حجوزات حتى الآن.</p>';
  document.getElementById("stat-bookings").textContent = snapshot.size;
  document.getElementById("stat-clients").textContent = clientSet.size;
}

function listenBookings() {
  stopBookingsListener = db.collection("bookings")
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot(snapshot => {
      renderBookings(snapshot);

      if (!firstBookingLoad) {
        snapshot.docChanges().forEach(change => {
          if (change.type === "added") {
            const booking = change.doc.data();
            showToast("حجز جديد", `${booking.name || "عميل"} حجز ${booking.service || "استشارة"} يوم ${booking.date || ""} — ${booking.slot || ""}`);
          }
        });
      }
      firstBookingLoad = false;
    }, error => {
      console.error("Bookings listener error:", error);
      showDashboardError("تعذر تحميل الحجوزات. غالبًا قواعد Firestore لا تسمح لهذا الحساب بالقراءة أو لم يتم نشر القواعد الصحيحة.");
    });
}

function listenVisits() {
  stopVisitsListener = db.collection("visits")
    .orderBy("ts", "desc")
    .limit(50)
    .onSnapshot(snapshot => {
      const list = document.getElementById("visits-list");
      list.innerHTML = "";

      snapshot.forEach(doc => {
        const visit = doc.data();
        const date = visit.ts?.toDate ? visit.ts.toDate().toLocaleString("ar-EG") : "الآن";
        const row = document.createElement("div");
        row.className = "row-item";
        row.innerHTML = `<div><b>${escapeHtml(visit.page || visit.path || "صفحة")}</b></div><span>${escapeHtml(date)}</span>`;
        list.appendChild(row);
      });

      if (snapshot.empty) list.innerHTML = '<p class="empty-note">لا توجد زيارات مسجّلة بعد.</p>';
      document.getElementById("stat-visits").textContent = snapshot.size;

      if (!firstVisitLoad) {
        snapshot.docChanges().forEach(change => {
          if (change.type === "added") {
            const visit = change.doc.data();
            showToast("زيارة جديدة", `زائر فتح ${visit.page || visit.path || "صفحة"}`);
          }
        });
      }
      firstVisitLoad = false;
    }, error => {
      console.error("Visits listener error:", error);
      const list = document.getElementById("visits-list");
      list.innerHTML = '<p class="empty-note">تعذر تحميل الزيارات. راجع قواعد Firestore.</p>';
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!FIREBASE_CONFIG_READY) {
    showDashboardError("Firebase غير مهيأ. عدّل firebase-config.js أولًا.");
    return;
  }

  const user = await requireAuth("auth.html?next=dashboard.html");

  if (!isAdminUser(user)) {
    showDashboardError("هذه الصفحة مخصّصة لصاحب المكتب فقط. جاري توجيهك لصفحة الحجز...");
    setTimeout(() => location.replace("booking.html"), 1500);
    return;
  }

  document.getElementById("admin-name").textContent = user.displayName || user.email;
  listenBookings();
  listenVisits();
});

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  try {
    if (stopBookingsListener) stopBookingsListener();
    if (stopVisitsListener) stopVisitsListener();
    await auth.signOut();
    location.replace("index.html");
  } catch (error) {
    console.error("Logout error:", error);
  }
});
