# منصة الأنشطة الصفية
## Classroom Activities Platform

منصة تعليمية متكاملة لإدارة أنشطة المعلمين، رفع صور الأنشطة، احتساب النقاط، متابعة الأداء، والتقارير.

Built with **Next.js 15+**, **TypeScript**, **Tailwind CSS**, **Supabase** (Auth + PostgreSQL + Storage), ready for **Vercel**.

---

## المميزات

- 🔐 نظام صلاحيات (Admin / Supervisor / Teacher)
- 📝 إضافة ومراجعة الأنشطة مع حالات (قيد المراجعة / معتمد / مرفوض)
- 🖼️ رفع صور متعددة عبر Supabase Storage
- ⭐ نظام نقاط قابل للتعديل من لوحة الإدارة
- 🏆 لوحة متصدرين + شارات (Gamification)
- 📊 تقارير وإحصائيات
- 🔔 إشعارات حقيقية
- 🌙 دعم الوضع الداكن + RTL كامل + Responsive

---

## المتطلبات

- Node.js 18+
- حساب [Supabase](https://supabase.com)
- حساب [Vercel](https://vercel.com) (للنشر)
- GitHub (موصى به)

---

## 1. إنشاء مشروع Supabase

1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً.
2. انتظر حتى يكتمل إنشاء قاعدة البيانات.
3. من **Project Settings → API** انسخ:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. تشغيل SQL Schema

1. في لوحة Supabase افتح **SQL Editor**.
2. انسخ محتوى الملف `supabase/schema.sql` بالكامل والصقه.
3. اضغط **Run**.

هذا ينشئ:
- الجداول (users, teachers, activities, activity_images, points, notifications, badges, teacher_badges, points_settings)
- Foreign Keys + Indexes
- RLS Policies
- Triggers (تحديث النقاط والمستوى تلقائياً)
- بيانات أولية للنقاط والشارات

---

## 3. إعداد Storage

1. اذهب إلى **Storage** في Supabase.
2. أنشئ Bucket باسم `activity-images`.
3. فعّل **Public bucket** (للقراءة).
4. أضف السياسات التالية من SQL Editor:

```sql
-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload activity images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activity-images');

-- Public read
CREATE POLICY "Anyone can view activity images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'activity-images');

-- Users can delete their own files
CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'activity-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 4. إعداد المشروع محلياً

```bash
# استنساخ المشروع
git clone <your-repo-url>
cd classroom-activities-platform

# تثبيت الحزم
npm install

# إنشاء ملف البيئة
cp .env.example .env.local
```

عدّل `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```bash
# تشغيل التطوير
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000)

---

## 5. إنشاء أول مستخدم (Admin)

1. سجّل حساباً جديداً من صفحة `/login`.
2. في Supabase → **Table Editor → users** غيّر `role` إلى `admin`.
3. (اختياري) أنشئ سجل في جدول `teachers` إذا أردت أن يكون المدير معلماً أيضاً.

---

## 6. النشر على Vercel

### الطريقة الموصى بها (GitHub)

1. ادفع المشروع إلى مستودع GitHub.
2. اذهب إلى [vercel.com](https://vercel.com) → **Add New Project**.
3. استورد المستودع.
4. أضف Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. اضغط **Deploy**.

بعد النشر ستحصل على رابط مثل:
`https://classroom-activities-platform.vercel.app`

### ملاحظات مهمة

- لا تضع `SERVICE_ROLE_KEY` في متغيرات البيئة العامة.
- تأكد أن RLS مفعّل على جميع الجداول.
- في حالة مشاكل CORS أو Auth، تحقق من **Authentication → URL Configuration** في Supabase وأضف رابط Vercel إلى Redirect URLs و Site URL.

---

## هيكل المشروع

```
src/
├── app/
│   ├── login/              # صفحة تسجيل الدخول
│   ├── dashboard/          # لوحة التحكم
│   ├── activities/         # قائمة الأنشطة + إضافة + تفاصيل
│   ├── leaderboard/        # لوحة المتصدرين
│   ├── reports/            # التقارير
│   ├── badges/             # الشارات
│   ├── notifications/      # الإشعارات
│   ├── profile/            # الملف الشخصي
│   ├── settings/           # الإعدادات
│   └── admin/              # لوحة الإدارة
│       ├── users/
│       ├── teachers/
│       ├── activities/
│       ├── points/
│       └── settings/
├── components/
│   ├── layout/             # Sidebar وغيرها
│   ├── ui/                 # مكونات واجهة
│   └── ...
├── lib/
│   ├── supabase/           # عملاء Supabase
│   └── utils.ts
└── types/
    └── database.ts
supabase/
└── schema.sql              # قاعدة البيانات كاملة
```

---

## الصلاحيات

| الدور       | الصلاحيات                                      |
|-------------|------------------------------------------------|
| **Admin**   | كل شيء (مستخدمين، معلمين، أنشطة، نقاط، إعدادات، تقارير) |
| **Supervisor** | مراجعة واعتماد/رفض الأنشطة + تقارير + نقاط إضافية |
| **Teacher** | إضافة أنشطة، رفع صور، مشاهدة نقاطه وترتيبه وشاراته |

---

## نظام النقاط (قابل للتعديل)

من **الإدارة → نظام النقاط** يمكن تغيير:

| المفتاح              | القيمة الافتراضية | الوصف              |
|----------------------|-------------------|--------------------|
| activity_submit      | 10                | إضافة نشاط         |
| activity_approve     | 20                | اعتماد النشاط      |
| activity_excellent   | 30                | نشاط متميز         |
| activity_images      | 5                 | رفع صور            |

---

## الشارات الافتراضية

- 🏆 المعلم المتميز (500 نقطة)
- ⭐ نجم الأنشطة (20 نشاطاً)
- 🔥 صاحب الهمة (200 نقطة)
- 📚 المعلم المبادر (10 أنشطة)
- 🚀 صانع الأثر (1000 نقطة)

---

## أوامر مفيدة

```bash
npm run dev      # تطوير
npm run build    # بناء للإنتاج
npm run start    # تشغيل البناء
npm run lint     # فحص الكود
```

---

## استكشاف الأخطاء

- **خطأ Auth بعد النشر**: أضف رابط Vercel في Supabase → Authentication → URL Configuration.
- **صور لا تظهر**: تأكد أن الـ bucket عام للقراءة وأن الـ policies صحيحة.
- **RLS يمنع القراءة**: تحقق من السياسات في schema.sql وتأكد أن المستخدم مسجّل دخوله.
- **Build fails**: تأكد من وجود جميع متغيرات البيئة في Vercel.

---

## الترخيص

هذا المشروع مخصص للاستخدام التعليمي والمدرسي.
EOF
