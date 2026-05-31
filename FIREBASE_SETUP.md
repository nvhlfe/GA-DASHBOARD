# Hướng Dẫn Cài Firebase Realtime Database

## Bước 1 — Tạo Firebase Project
1. Vào https://console.firebase.google.com
2. Click **"Add project"** → đặt tên (vd: `ga-d03-dashboard`) → Continue → Create project

## Bước 2 — Bật Realtime Database
1. Sidebar trái → **Build → Realtime Database**
2. Click **"Create Database"**
3. Chọn region: **asia-southeast1 (Singapore)**
4. Chọn **"Start in test mode"** (cho phép đọc/ghi tự do 30 ngày) → Enable

## Bước 3 — Lấy Firebase Config
1. Project Settings (⚙️ góc trái) → **General**
2. Cuộn xuống **"Your apps"** → Click **"</>"** (Web app)
3. Đặt tên app → Register app
4. Copy đoạn config như sau:
```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "ga-d03-xxx.firebaseapp.com",
  databaseURL: "https://ga-d03-xxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ga-d03-xxx",
  storageBucket: "ga-d03-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc"
};
```

## Bước 4 — Điền config vào App.jsx
Mở file `src/App.jsx`, tìm đoạn `FIREBASE_CONFIG` ở đầu file và thay thế:
```js
const FIREBASE_CONFIG = {
  apiKey: "AIza...",          // ← điền vào đây
  authDomain: "...",
  databaseURL: "https://...", // ← quan trọng: phải có databaseURL
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}
```

## Bước 5 — Build lại & Deploy
```bash
npm run build
```
Sau đó deploy lên Vercel như bình thường.

## Cách hoạt động Realtime
- **Upload Excel** → dữ liệu được đẩy lên Firebase
- **Tất cả browser** đang mở dashboard sẽ **tự động cập nhật** ngay lập tức
- Dot xanh 🟢 ở sidebar = đang kết nối Firebase thành công
- Hiển thị thời gian cập nhật gần nhất

## Security Rules (sau 30 ngày test mode)
Vào Realtime Database → Rules → dán:
```json
{
  "rules": {
    "ga_d03": {
      ".read": true,
      ".write": true
    }
  }
}
```
Hoặc thêm Authentication để bảo mật hơn.

## Deploy Vercel
1. Push code lên GitHub
2. vercel.com → Import repo → Deploy
3. Mỗi lần upload Excel mới → tất cả user thấy ngay
