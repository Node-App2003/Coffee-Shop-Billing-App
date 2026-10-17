# ☕ Cafe Billing - Coffee Shop Billing App

React + Vite web app, Capacitor vazhiya Android APK-a maarum.
Internet venaam - ella data-um phone/browser-la (localStorage) save aagum.

| Route | Yaarukku | Enna irukku |
|-------|----------|-------------|
| `/` | Cashier | Category, product search, cart, payment, bill, print |
| `/admin` | Owner (password) | Reports, Sales, Products, Categories, Expenses, Bill history, Settings |

**First login:** username `admin`, password `admin123`  -> Settings-la udane maathidunga.

---

## 1. Computer-la run panna (Step by step)

1. **Node.js 20+** install pannunga (https://nodejs.org - LTS). Check: `node -v`
2. Project folder-kulla terminal open pannunga:
   ```bash
   cd cafe-billing
   npm install        # dependencies download aagum (first time mattum)
   npm run dev        # dev server start
   ```
3. Browser-la `http://localhost:5173` open pannunga -> Billing screen.
   Admin: `http://localhost:5173/admin`
4. Phone-la same WiFi-la test panna, terminal-la kaattura `Network:` URL-a phone browser-la open pannunga.
5. Production build: `npm run build` (output `dist/` folder).

## 2. Android APK create panna

### Option A - GitHub (Android Studio venaam, easiest)
1. GitHub-la new repository create pannunga, indha project-a push pannunga.
2. Repo -> **Actions** tab -> **Build Android APK** -> **Run workflow**.
3. 5-8 min-la mudiyum. Run page-oda keezha **Artifacts -> cafe-billing-apk** download pannunga (zip-kulla `app-debug.apk`).
4. APK-a phone-ku anuppunga (WhatsApp / USB / Drive).
5. Phone-la APK open pannunga -> "Install unknown apps" allow pannunga -> Install.

### Option B - Unga computer-la (Android Studio)
1. **Android Studio** install pannunga (SDK-oda varum) + **JDK 17**.
2. Terminal-la:
   ```bash
   npm install
   npm run android:add     # android/ folder create (first time mattum)
   npm run android:sync    # web build + android-ku copy
   npm run android:open    # Android Studio-la open aagum
   ```
3. Android Studio-la Gradle sync mudiyaum varai wait pannunga.
   **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
4. APK path: `android/app/build/outputs/apk/debug/app-debug.apk`
5. Phone USB debugging on pannitu **Run ▶** click pannalum direct-ah install aagum.

> Code maathina apram: `npm run android:sync` -> Android Studio-la mela sonna maathiri APK rebuild.
> Play Store-ku publish panna **Build -> Generate Signed Bundle/APK** use pannunga (release signing key venum).

## 3. App eppadi velai seiyudhu

### Billing (`/`)
- Mela search box + category chips (All, Coffee, Tea, Snacks, Milkshakes, Cake & Desserts).
- Product tap -> cart-la add. Cart-la `+ / -`, remove, Clear.
- Subtotal -> Tax (optional, Settings-la on/off) -> Round off -> Grand total auto.
- **Pay** -> Cash / UPI / Card / Split (3 amount-um total-oda match aaganum).
- Confirm pannina **unique bill number** (`CB-20261017-0001`) udane save aagum, receipt kaattum: shop name, date/time, items, total, payment method.
- **Print** (browser) / **PDF** (APK-la share sheet-la irundhu Print or Save).

### Admin (`/admin`)
- **Reports**: Daily/Weekly/Monthly graph, payment breakdown, expense vs sales, estimated profit (sales - expenses), best & least selling, CSV/PDF export.
- **Sales**: Today, Yesterday, Week, Month, Year, All, Custom date. Total bills, average, payment-wise.
- **Products**: add/edit/delete, inline price change, enable/disable, image upload, category assign.
- **Categories**: create/edit/delete (products irundha delete aagathu).
- **Expenses**: Milk, Coffee powder, Sugar, Staff, Other.
- **Bill History**: bill number search, date filter, view, reprint.
- **Settings**: shop name/address/phone/currency/tax/footer, **admin username & password maathura**, backup export/restore.

## 4. Project structure
```
src/
  main.jsx            app start
  App.jsx             routes (/ and /admin) + admin login gate
  store.js            ellaa data + actions + password check (localStorage)
  utils.js            money/tax calc, date ranges, CSV/PDF export, print
  analytics.js        report calculations (sales series, best sellers...)
  index.css           full design (white + coffee brown)
  components/         Modal, Receipt (+print), RangePicker
  pages/Billing.jsx   cashier screen
  pages/admin/*.jsx   Login, AdminLayout, Reports, Sales, Products,
                      Categories, Expenses, Bills, Settings
capacitor.config.json Android app id/name
.github/workflows/    APK build automation
```

## 5. Mukkiyamaana notes
- Data **andha device-la mattum** irukkum. Phone clear/uninstall pannina data pogum -> Settings-la **Export backup** regular-ah edungal.
- Admin password device-local protection - shop staff-ah thaduka; bank-level security illa.
- Bluetooth thermal printer direct support illa. APK-la PDF share -> printer app-ku anuppalam. (Venumna Capacitor Bluetooth printer plugin add pannalaam.)
- App name/id maathanum na `capacitor.config.json` (`appId`, `appName`) edit pannunga - `android/` create panra munnadiye.
