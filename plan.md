# خطة عمل مشروع فندقي (Fandqi)

## الهدف
نظام SaaS متعدد المستأجرين لإدارة الفنادق — 3 أدوار: صاحب المنصة، مدير الفندق، موظف الاستقبال.

---

## البنية التقنية
- **Backend**: Django 5.1.4 + Django REST Framework + JWT (`djangorestframework-simplejwt`)
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **قاعدة البيانات**: SQLite (تطوير) → PostgreSQL (إنتاج)
- **Django**: `backend/` | **Next.js**: `frontend/` | **الكود القديم**: `apps/web/public/`

---

## المستخدمون التجريبيون
| المستخدم | كلمة المرور | الدور |
|---|---|---|
| platform | 123456 | صاحب المنصة |
| manager | 123456 | مدير الفندق |
| reception | 123456 | موظف الاستقبال |

أوامر البذر: `python manage.py seed_users` | `python manage.py seed_data` | `python manage.py seed_hotels`

---

## نماذج Django (Models) المنجزة

| النموذج | الملف | الحقول الرئيسية |
|---|---|---|
| Hotel | api/models.py | name, country, city, address, phone, email, status, floors_count, manager_name, manager_email |
| Package | api/models.py | name, description, duration_days, price, currency, max_users, max_rooms, restaurant_support, reports_support, trial_support, status |
| Subscription | api/models.py | hotel, package, status, payment_status, start_date, end_date, monthly_amount, currency |
| SubscriptionRequest | api/models.py | hotel, package, status, notes |
| Room | api/models.py | hotel, number, floor, type, capacity, status, price, currency |
| Staff | api/models.py | hotel, full_name, role, phone, email, shift, status, permissions |

---

## نقاط API المنجزة

| المسار | الوصف |
|---|---|
| `POST /api/token/` | تسجيل الدخول JWT |
| `GET /api/current-user/` | بيانات المستخدم الحالي + الدور |
| `GET /api/platform/stats/` | إحصائيات لوحة تحكم صاحب المنصة |
| `GET/POST /api/hotels/` | قائمة وإنشاء الفنادق |
| `GET/PUT/DELETE /api/hotels/{id}/` | تعديل وحذف فندق |
| `POST /api/hotels/{id}/set_status/` | تغيير حالة فندق |
| `GET/POST /api/packages/` | الباقات |
| `POST /api/packages/{id}/set_status/` | تغيير حالة باقة |
| `GET/POST /api/subscriptions/` | الاشتراكات |
| `POST /api/subscriptions/{id}/renew/` | تجديد اشتراك |
| `GET/POST /api/subscription-requests/` | طلبات الاشتراك |
| `POST /api/subscription-requests/{id}/approve/` | موافقة على طلب |
| `POST /api/subscription-requests/{id}/reject/` | رفض طلب |
| `GET/POST /api/rooms/` | الغرف (مع فلتر `?hotel=id`) |
| `GET/POST /api/staff/` | الموظفون (مع فلتر `?hotel=id`) |

---

## صفحات Next.js المنجزة

### المصادقة
- [x] `/login` — تسجيل دخول مع RTL وحسابات تجريبية، يوجّه حسب الدور

### صاحب المنصة `/platform`
- [x] Layout مع sidebar (الفنادق، المديرون، الباقات، الاشتراكات، الطلبات، الإعدادات) + topbar مع تسجيل خروج
- [x] `/platform` — لوحة تحكم بإحصائيات حقيقية من API
- [x] `/platform/hotels` — قائمة الفنادق مع بحث وفلتر + CRUD (إضافة/تعديل/عرض/تفعيل/إيقاف/أرشفة)

### مدير الفندق `/manager`
- [x] `/manager` — لوحة تحكم مبدئية (placeholder)

### موظف الاستقبال `/reception`
- [x] `/reception` — لوحة تحكم مبدئية (placeholder)

---

## سجل التقدم (محدَّث 2026-06-28)

- [x] إنشاء مشروع Django + Next.js + Tailwind
- [x] JWT Auth + seed users
- [x] نموذج Hotel أساسي + API
- [x] صفحة تسجيل دخول RTL
- [x] توجيه حسب الدور (platform/manager/reception)
- [x] تسجيل خروج في كل الصفحات
- [x] **توسيع نموذج Hotel** (status, phone, email, address, manager_name, floors_count)
- [x] **إضافة نماذج Package, Subscription, SubscriptionRequest, Room, Staff**
- [x] **إنشاء API endpoints** لجميع النماذج الجديدة
- [x] **لوحة تحكم صاحب المنصة** مع إحصائيات حقيقية من API
- [x] **صفحة الفنادق** مع CRUD كامل (إضافة/تعديل/عرض/تفعيل/إيقاف/أرشفة)
- [x] **Sidebar layout** لصاحب المنصة

---

## المراحل القادمة

### المرحلة الثالثة — صاحب المنصة (باقي الصفحات)
- [ ] `/platform/packages` — CRUD الباقات
- [ ] `/platform/subscriptions` — إدارة اشتراكات الفنادق
- [ ] `/platform/subscription-requests` — موافقة/رفض طلبات الاشتراك
- [ ] `/platform/managers` — قائمة مديري الفنادق
- [ ] `/platform/settings` — إعدادات المنصة

### المرحلة الرابعة — مدير الفندق
- [ ] Layout مع sidebar لمدير الفندق
- [ ] `/manager` — لوحة تحكم بإحصائيات (غرف، حجوزات، نزلاء)
- [ ] `/manager/rooms` — CRUD الغرف والطوابق
- [ ] `/manager/staff` — CRUD الموظفين وصلاحياتهم
- [ ] `/manager/hotel-settings` — إعدادات الفندق

### المرحلة الخامسة — الحجوزات والنزلاء
- [ ] نموذج Reservation في Django
- [ ] نموذج Guest في Django (مع وثائق ومرافقين)
- [ ] `/manager/reservations` — نظام الحجز الكامل
- [ ] `/manager/guests` — سجلات النزلاء
- [ ] `/manager/check-in-out` — الاستقبال والمغادرة

### المرحلة السادسة — الخدمات
- [ ] نماذج MenuItem, FoodOrder, HousekeepingTask, MaintenanceReport, Payment, Notification
- [ ] `/manager/food-services` — المطعم والكافتريا
- [ ] `/manager/housekeeping` — التنظيف
- [ ] `/manager/maintenance` — الصيانة
- [ ] `/manager/payments` — المدفوعات
- [ ] `/manager/reports` — التقارير
- [ ] `/manager/notifications` — الإشعارات

### المرحلة السابعة — موظف الاستقبال
- [ ] Layout مع sidebar لموظف الاستقبال
- [ ] `/reception/check-in-out` — الدخول والمغادرة
- [ ] `/reception/reservations` — الحجوزات (صلاحيات محدودة)
- [ ] `/reception/payments` — المدفوعات

### المرحلة الثامنة — التحسينات
- [ ] دعم اللغتين العربية والإنجليزية (i18n)
- [ ] تجديد JWT Token تلقائياً
- [ ] طباعة الفواتير والوثائق
- [ ] PostgreSQL للإنتاج

---

## ملاحظات تقنية
- RTL في كل الصفحات (`dir="rtl"`)
- توكن JWT مخزون في `localStorage` (access_token, refresh_token, role)
- Backend Django يعمل على `http://localhost:8000`
- Frontend Next.js يعمل على `http://localhost:3000`
- `react.FormEvent` مهجور في React 19 — نستخدم `e: { preventDefault(): void }`
