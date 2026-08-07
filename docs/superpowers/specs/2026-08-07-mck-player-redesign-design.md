# MCK Player — Redesign giao diện & sửa logic phát nhạc

Ngày: 2026-08-07
Trạng thái: Đã duyệt

## Mục tiêu

Làm lại giao diện trang web nghe nhạc 30 bài MCK theo hướng **Glassmorphism hiện đại**, sang trọng như phần mềm nghe nhạc chuyên nghiệp; đồng thời sửa các lỗi logic đã được người dùng xác nhận:

1. Phát 2 bài cùng lúc.
2. Chuyển Ảnh ↔ MV bị giật/ngắt tiếng.
3. Không chỉnh được âm lượng trên điện thoại.
4. Phát nền/tắt màn hình bị dừng.
5. Nhớ vị trí/bài sai khi tải lại trang.

## Ràng buộc (không đổi)

- Không đổi tên/đường dẫn dữ liệu: `images/`, `MP4/`, `MV/`, `js/data.js` (30 bài, 6 bài có MV: #2, #7, #15, #20, #22, #24).
- Chế độ mặc định khi mở bài: phát audio từ `MP4/`, hiển thị ảnh bìa từ `images/`; bài có MV thì người dùng có thể chọn xem MV.
- PWA: manifest, sw.js, phát nền, Media Session trên màn hình khóa.
- Responsive desktop + mobile, phát nền khi tắt màn hình điện thoại.

## Thiết kế giao diện

### Phong cách
- Nền tối sâu `#07070a`, có lớp **ambient glow** động: ảnh bìa bài đang phát được blur làm nền phía sau panel, phủ lớp tối/viền, đổi màu theo bài.
- **Signature: đĩa vinyl xoay** — ảnh bìa render thành đĩa tròn với nhãn đĩa ở giữa; xoay khi phát, dừng khi tạm dừng (`animation-play-state`).
- **Font "Be Vietnam Pro"** (Google Fonts, hỗ trợ tiếng Việt đầy đủ), `font-display: swap`, fallback hệ thống khi offline.
- **Thay toàn bộ emoji bằng inline SVG icon** (play, pause, prev, next, shuffle, repeat, volume, search, close, MV, photo). Cùng bộ icon cho cả nút và trạng thái.
- **Glassmorphism**: `backdrop-filter: blur` + border `rgba(255,255,255,0.08)` cho topbar, panel điều khiển, mini-player.
- **Equalizer động** (3 thanh) trên bài đang phát trong danh sách và trong panel Đang phát.
- Micro-interaction: hover scale nhẹ nút play, highlight dòng bài hát, active state rõ ràng cho shuffle/repeat. Tôn trọng `prefers-reduced-motion`.

### Bố cục
- **Desktop (≥ 900px):** topbar (logo + tìm kiếm + số bài) → thân gồm playlist (trái, linh hoạt) + panel "Đang phát" (phải, cố định ~400px). Panel: đĩa xoay lớn / video MV, tên bài, tiến trình, điều khiển, volume, segmented Ảnh|MV.
- **Mobile (< 900px):** topbar compact + playlist toàn màn hình; **mini-player kính** ở đáy (cover, tên bài, progress, nút play); chạm → mở **sheet toàn màn hình** (đĩa xoay lớn, tiến trình, điều khiển, volume, segmented Ảnh|MV).
- Mỗi dòng bài hát: ảnh bìa nhỏ, tên (xuất sắc có thể 2 dòng), nghệ sĩ "MCK", **badge "MV"** nếu có, thời lượng (đọc async từ metadata), equalizer khi đang phát.

### Trạng thái trực quan
- Segmented control "Ảnh | MV": nút MV `disabled` khi bài không có MV (mờ + badge khóa).
- Shuffle active = accent; Repeat 3 trạng thái: off → all → one (icon đổi theo trạng thái).

## Thiết kế logic (sửa lỗi)

### Kiến trúc media — "handoff" (sửa lỗi #1, #2)
- Giữ 2 element: `<audio id="audio-el">` (nhạc) và `<video id="mv-video">` (MV). Mọi lúc **chỉ một element được phép play**.
- `activeEl()` / `inactiveEl()` dựa trên `viewMode` như hiện tại.
- Hàm `handoff()` async khi chuyển Ảnh ↔ MV:
  - Nếu không đang phát: swap ngay.
  - Nếu đang phát: element cũ **tiếp tục phát** (không ngắt tiếng); element mới load → chờ `canplay` → seek `currentTime = element cũ` → `play()` → chờ sự kiện `playing` → mới `pause()` element cũ.
  - Timeout an toàn (4s): nếu element mới không sẵn sàng, huỷ chuyển, giữ element cũ.
  - Hủy chuyển đang dang dở nếu người dùng đổi bài/nhấn tiếp.
- Sự kiện `timeupdate`/`ended`/`play`/`pause` chỉ xử lý cho `activeEl()`.

### Trạng thái isPlaying (sửa lỗi #1)
- `isPlaying` chỉ được set từ sự kiện thật `play`/`pause` của element, không set tay. Điều khiển UI (icon, highlight) bám theo trạng thái này.

### Volume trên mobile (sửa lỗi #3)
- Thêm thanh volume vào sheet toàn màn hình (mobile); hiện như hiện tại trên panel desktop. Volume lưu vào localStorage.

### Phát nền (sửa lỗi #4)
- Bắt đồng thời: `visibilitychange`, `pagehide`, và sự kiện `pause` của video khi `document.hidden`.
- Khi `document.hidden` và `viewMode === 'mv'` và đang phát → tự `handoff` sang chế độ ảnh (audio) **cùng vị trí** để iOS/Safari tiếp tục phát khi khóa màn hình.
- Media Session: set metadata + positionState; handlers play/pause/next/prev/seek.

### Khôi phục state (sửa lỗi #5)
- `saveState` gọi thêm khi `pagehide` (đóng tab) để vị trí luôn mới.
- Khi restore: load đúng bài + chế độ (image|mv, kiểm tra bài có MV) → chờ `loadedmetadata` → áp vị trí chính xác → `saveState(true)` 1 lần với vị trí đúng (không để loadSong ghi đè 0).
- Lưu `wasPlaying`; nếu đang phát trước đó → đăng ký listener 1 lần cho `pointerdown` đầu tiên để tự phát lại (vì trình duyệt chặn autoplay có tiếng).

## Kiểm thử
- Chạy `python -m http.server 8000`; dùng Playwright (nếu có) kiểm tra trên viewport desktop + mobile:
  - Phát/dừng, next/prev, shuffle, repeat (all/one/off), tìm kiếm.
  - Chuyển Ảnh↔MV: không ngắt tiếng, vị trí giữ nguyên, chỉ 1 element play.
  - Không có 2 bài phát cùng lúc khi đổi bài nhanh.
  - Volume (desktop + mobile sheet), lưu volume.
  - Tải lại trang: đúng bài + vị trí + chế độ.
- Kiểm tra thủ công trên điện thoại (phát nền, khóa màn hình) — người dùng xác nhận.

## Files sẽ sửa
- `index.html` — cấu trúc + SVG icon, thay emoji.
- `css/style.css` — viết lại toàn bộ theo thiết kế.
- `js/app.js` — viết lại lớp media/state (handoff, isPlaying, restore, volume mobile).
- `sw.js`, `manifest.json`, `js/data.js` — giữ nguyên (bump cache version nếu cần).
