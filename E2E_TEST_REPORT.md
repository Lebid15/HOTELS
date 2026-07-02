# E2E_TEST_REPORT — تقرير الاختبار الشامل من الطرف إلى الطرف (funduqii)

> يوثّق تغطية السيناريو التشغيليّ الكامل العابر للأدوار عبر **اختبارات آلية حقيقية**
> تُنفَّذ في بوّابة الجودة. **كل خطوة مربوطة بـ assert فعليّ** (تشغيل الاختبار = حدوث
> النتيجة فعلًا؛ لا PASS بلا دليل).

**آخر تنفيذ:** 2026‑07‑02 · **طريقة التشغيل:** `python manage.py test api.tests_e2e_scenario`
· **النتيجة:** `Ran 8 tests … OK` (8/8) · **الحزمة الكاملة:** **216 / 216 PASS** (152+56+8 E2E).

---

## 1) المرحلة 12 — السيناريو التشغيليّ الشامل (سلسلة التحصين)

الملف: `backend/api/tests_e2e_scenario.py` · الصنف: `FullE2EScenarioTests`.

### أ) المسار الناجح الكامل — `test_full_operational_scenario` — ✅ PASS

| # | الإجراء | المتوقّع | الفعليّ | الحالة | ملاحظات |
|---|--------|---------|--------|:------:|---------|
| 1 | صاحب المنصّة يهيّئ فندقًا + باقة (ظهور+حجز) + اشتراك فعّال + عمولة 10% | أدوار رسمية صحيحة | `platform_owner`/`manager`/`reception` عبر `UserProfile` | PASS | تهيئة ORM (دور صاحب المنصّة) |
| 2 | ربط الفندق بالمدير + إنشاء غرفة ظاهرة سعرها 100 | فندق مؤهّل بالكامل | `slug`/city/سعر مضبوطة | PASS | م2 |
| 3 | الزائر يفتح قائمة الفنادق العامة | الفندق يظهر | `GET /public/hotels/` يحوي الفندق | PASS | |
| 4 | تفاصيل الفندق + التوفّر | 200 + الغرفة متاحة | detail=200، availability فيه `single` | PASS | |
| 5 | إنشاء حجز عام | 201 + رقم + `manage_token` + `manage_url` | 201، الحقول الثلاثة موجودة والرمز داخل الرابط | PASS | م3 |
| 6 | lookup برقم + **هاتف بصيغة مختلفة** (`0944…`) | 200، بلا رمز/رابط، هاتف مقنّع | لا `manage_token`/`manage_url`، الهاتف فيه `*` | PASS | م3+م5 (الحجز مُخزَّن `+963 944 123 456`) |
| 7 | المدير يرى الحجز في اللوحة الداخلية | الحجز يظهر | `GET /reservations/` يحوي الحجز | PASS | |
| 8 | الاستقبال: check‑in | الحالة=دخول، الغرفة=مشغولة | `checked_in` + `occupied` | PASS | |
| 9 | FolioCharge +50 على الحجز | الرصيد يزيد 50 | balance = 200→250 | PASS | م1 |
| 10 | إبطال FolioCharge بسبب | 200، مُستثنى، باقٍ كسجلّ مبطل، Audit | balance→200، `voided=True`، `folio_charge.void` مُسجَّل | PASS | م1 |
| 11 | FoodOrder نقديّ كامل 40 | 201، لا يدخل الذمّة | 201، balance يبقى 200 | PASS | م8 (نقديّ ليس على الغرفة) |
| 12 | محاولة خروج مع دين (200) | **402** balance_due | 402، `code=balance_due` | PASS | منع الخروج بالدين |
| 13 | دفعة تسوية 200 | 201، الرصيد=0 | balance→0 | PASS | م4 |
| 14 | check‑out | 200، مغادر، الغرفة→تنظيف | `checked_out` + `cleaning` | PASS | |
| 15 | عمولة المنصّة | 200×10%=20 (snapshot) + تظهر للمالك | `commission_amount=20`، `res.platform_commission_amount=20`، earnings=200 | PASS | م(عمولة) |
| 16 | إغلاق اليوم (المدير) | 201، اللقطة تعكس المدفوعات | 201، `payments_total ≥ 200` | PASS | لا أخطاء حاجزة بعد الخروج |
| 17 | سجلّ التدقيق | يحوي الأحداث الحسّاسة | `check_in`/`folio_charge.void`/`payment.create`/`check_out`/`day.close` كلّها موجودة | PASS | |

### ب) طلب على حساب الغرفة يدخل الذمّة — `test_room_account_food_enters_balance` — ✅ PASS
| الإجراء | المتوقّع | الفعليّ | الحالة |
|--------|---------|--------|:------:|
| FoodOrder على حساب الغرفة (30) لحجز دَاخِل | الرصيد يزيد 30 | balance = قبل+30 | PASS |

---

## 2) الحالات السلبية — منفَّذة فعليًّا (نفس الملف) ✅

| # | الحالة | المتوقّع | الفعليّ | الحالة | الاختبار |
|---|--------|---------|--------|:------:|---------|
| 1 | حجز فندق مخفيّ (`public_listing_enabled=False`) | 400 | 400 | PASS | `test_neg_hidden_hotel_not_bookable` |
| 2 | حجز مع اتفاقية فعّالة غير مقبولة | 400، ثم 201 بعد القبول | 400 → 201 | PASS | `test_neg_agreement_required_then_accepted` |
| 3 | غرفة غير ظاهرة في التوفّر | قائمة فارغة | `[]` | PASS | `test_neg_non_public_room_hidden_in_availability` |
| 4 | إبطال FolioCharge بلا سبب | 400 | 400 | PASS | `test_neg_folio_void_without_reason_rejected` |
| 5 | مستخدم بلا Profile يدخل قسمًا محميًّا | 403 | 403 | PASS | `test_neg_no_profile_user_forbidden` |
| 6 | تجاوز حدّ throttling على نقطة عامة | 429 بعد الحدّ | 429 | PASS | `test_neg_throttling_returns_429` |
| — | lookup لا يكشف `manage_token` | مضمّن في المسار الناجح (خطوة 6) | — | PASS | — |
| — | منع الخروج بالدين | مضمّن في المسار الناجح (خطوة 12) | — | PASS | — |

> تغطية إضافية مستقلّة لكل بند تحصين (56 اختبارًا) في `api/tests_hardening.py` (م11).

---

## 3) بوّابة الجودة (تُعاد قبل كل إصدار)
```
backend:  python manage.py check                           # 0 مشاكل
          python manage.py makemigrations --check --dry-run # لا ترحيلات معلّقة (0038)
          python manage.py test api                         # 216 / 216 PASS (152+56+8 E2E)
          python manage.py test api.tests_e2e_scenario      # 8/8 (م12)
          python manage.py check --deploy (env إنتاجيّ)     # 0 issues (م9)
frontend: npm run lint / typecheck / build                  # 0 / 0 / ناجح
```

## 4) ما لا يُغطّى آليًا (Smoke يدويّ بعد النشر)
- سلوك `SessionGuard` في المتصفّح الحقيقي (401→تجديد→إعادة الطلب).
- ترويسات الأمان الفعلية على استجابة الإنتاج (CSP/X‑Frame/HSTS) بأداة خارجية.
- تجربة الواجهة العامة بصريًّا (الحجز/الإدارة) على متصفّح فعليّ.
- انظر `RELEASE_CHECKLIST.md` قسم (د) لخطوات الـSmoke بعد النشر.

---

## 5) الأرشيف — سيناريوهات مراحل الإغلاق التجاري (سابقة، لا تزال خضراء)
`EndToEndScenarioTests`: رحلة الموقع العام الكاملة + رحلة الحجز المباشر (دخول→طعام/فوليو→منع الخروج 402→تسوية ذرّية→خروج→إغلاق يوم). محفوظة ضمن الحزمة (216).
