# موقع مكتب المحامي — Vercel + Firebase

هذا المشروع Static ويعمل على Vercel، بينما Firebase مسؤول عن:

- إنشاء الحسابات وتسجيل الدخول عبر Firebase Authentication.
- ملفات المستخدمين في Cloud Firestore.
- الحجوزات والمواعيد في Cloud Firestore.
- منع حجز نفس الموعد مرتين باستخدام transaction + slotLocks.
- لوحة تحكم محمية بقواعد Firestore.
- تسجيل زيارات الموقع وإظهارها لحظيًا في لوحة التحكم.

> **مهم:** لا يمكن تضمين مشروع Firebase الخاص بك داخل ZIP من دون بيانات مشروعك. لذلك يوجد مكان واضح في `firebase-config.js` لاستبدال القيم التجريبية ببيانات Web App من Firebase Console.

## 1. إعداد Firebase

### Authentication

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

Firebase توثق إنشاء الحساب وتسجيل الدخول باستخدام `createUserWithEmailAndPassword` و`signInWithEmailAndPassword`. 

### Firestore

Firebase Console → Firestore Database → Create database.

يفضل Production/Locked mode ثم نشر ملف `firestore.rules` الموجود في المشروع.

### Web App config

Firebase Console → Project settings → General → Your apps → Web app.

انسخ القيم إلى `firebase-config.js`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const ADMIN_EMAIL = "your-email@example.com";
```

استخدم نفس البريد الإداري الموجود في `firebase-config.js` داخل شرط `admin()` في `firestore.rules`. يجب أن يكون البريد متطابقًا تمامًا مع بريد حساب المدير في Firebase Authentication.

## 2. نشر Firestore Rules

يمكنك لصق محتوى `firestore.rules` في:

Firebase Console → Firestore Database → Rules → Publish.

أو باستخدام Firebase CLI بعد تسجيل الدخول إلى مشروعك:

```bash
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
```

## 3. Authorized domains

بعد أول Deploy على Vercel، أضف الدومين إلى:

Firebase Console → Authentication → Settings → Authorized domains

أضف مثلًا:

- `your-project.vercel.app`
- الدومين المخصص إذا كنت تستخدمه.

## 4. رفع Vercel

لا يوجد Build step مطلوب.

- Framework: Other / Static
- Build Command: فارغ
- Output Directory: فارغ
- Deploy

## 5. اختبار كامل

1. افتح `auth.html`.
2. اختر «حساب جديد».
3. أنشئ حسابًا بالبريد وكلمة مرور 6 أحرف أو أكثر.
4. بعد نجاح التسجيل ستفتح `booking.html`.
5. اختر التاريخ والموعد.
6. أكمل رقم الهاتف ونوع الاستشارة واضغط «تأكيد الحجز».
7. في Firestore يجب أن تظهر collections:
   - `users`
   - `bookings`
   - `slotLocks`
   - `visits`
8. سجّل الدخول بحساب المدير وافتح `dashboard.html`.
9. جرّب من جهاز آخر حجز نفس الموعد؛ يجب أن يظهر محجوزًا ولا يمكن حجزه مرة ثانية.

## 6. أهم الملفات

- `firebase-config.js` — إعداد Firebase + بريد المدير.
- `firestore.rules` — الصلاحيات الفعلية لقاعدة البيانات.
- `auth.js` — التسجيل وتسجيل الدخول ورسائل الأخطاء.
- `booking.js` — الحجز ومنع التعارض.
- `dashboard.js` — لوحة التحكم والتحديث اللحظي.
- `vercel.json` — إعدادات Vercel.

## 7. ملاحظة أمان

`apiKey` و`projectId` الخاصان بتطبيق Firebase Web ليسا بديلًا عن قواعد الأمان. الأمان الحقيقي للحجوزات والبيانات يأتي من Firebase Authentication وFirestore Security Rules. لا تضع Service Account JSON أو Firebase Admin SDK credentials داخل ملفات الموقع.


## الإصلاحات المطبقة في هذه النسخة

- إصلاح فحص جاهزية Firebase؛ البريد الإداري الحقيقي لم يعد يُعامل كقيمة Placeholder.
- إصلاح التحقق من صلاحية المدير في الواجهة.
- تقوية Firestore Rules لمنع تزوير البريد/الهاتف/الاسم والخدمة والموعد.
- ربط الحجز وقفل الموعد داخل Transaction واحدة باستخدام `getAfter()` للتحقق من أن المستندين ينتميان إلى بعضهما قبل اعتماد العملية.
- حصر الخدمات والمواعيد المسموح بها داخل قواعد Firestore.
- التحقق من صيغة التاريخ ورقم الهاتف من جهة العميل والقواعد.
- منع الحجوزات بتاريخ سابق من واجهة الحجز.
- منع المستخدم العادي من الوصول إلى لوحة التحكم وإعادة توجيهه للموقع.
- إصلاح رابط الحساب للمستخدم العادي ليذهب إلى صفحة الحجز، بينما المدير يرى لوحة التحكم.
- إصلاح توافق Three.js r128 باستخدام `outputEncoding = THREE.sRGBEncoding`.

### ملاحظة مهمة
رقم الهاتف والبريد الظاهرين في الصفحة الرئيسية ما زالا القيمتين التجريبيتين الموجودتين أصلًا (`01000000000` و`info@lawyer-domain.com`) لأن المشروع لا يحتوي على بيانات اتصال حقيقية أخرى يمكن الاعتماد عليها. يجب استبدالهما قبل النشر النهائي.


### Firestore Rules compatibility fix
The booking transaction uses the booking document ID as the slotLocks document ID. This avoids dynamic path expressions based on `request.resource.data.*` in Security Rules and lets `getAfter()` use the rule path wildcard directly.
