# MCK Player — Chuyển đổi giao diện kiểu YouTube

- Ngày: 2026-08-07
- Trạng thái: Đã duyệt (thiết kế), chờ chuyển sang lập kế hoạch
- Phạm vi: **Chỉ đổi giao diện hiển thị**. Giữ nguyên mọi tính năng, màu sắc, dữ liệu và service worker hiện có.

## 1. Mục tiêu

Chuyển trình nghe nhạc MCK (30 bài) từ bố cục "danh sách trái + panel đang phát phải" sang bố cục giống YouTube:

- **Trang chủ**: lưới thẻ bài hát kiểu trang chủ YouTube (thumbnail vuông, duration overlay, badge MV).
- **Trang xem (watch)**: bấm 1 bài → màn hình lớn bên trái, danh sách phát bên phải (desktop); trên mobile là 1 cột có danh sách cuộn bên dưới.
- **Topbar + sidebar trái**: thanh điều hướng (Trang chủ · Có MV · Đang phát).
- **Thanh phát đáy**: cố định khi đang ở trang chủ (desktop lẫn mobile), ẩn khi ở trang xem.

## 2. Nguyên tắc không đổi (hard constraints)

- Màu sắc/tokens: `--bg #07070a`, accent tím `#a78bfa` → hồng `#f472b6` gradient, glass, ambient glow. Không đổi.
- Font "Be Vietnam Pro", không dùng emoji (SVG icon), tôn trọng `prefers-reduced-motion`.
- `js/data.js` không đổi; `sw.js` không đổi (vẫn phục vụ Range 206 cho media — phụ thuộc để seek hoạt động).
- Key lưu trạng thái giữ nguyên `mck_player_state_v2` để không mất bài/vị trí đang nghe dở.
- Mọi hành vi: shuffle/repeat (off/all/one), seek, volume, phím tắt (Space, mũi tên, Esc), Media Session + điều khiển khóa màn hình, chuyển Ảnh↔MV liền mạch (handoff token), phát nền khi ẩn (MV → Ảnh), lưu trạng thái khi ẩn/đóng trang, resume khi quay lại (pointerdown), search không dấu, thời lượng bài tự nạp.

## 3. Kiến trúc

SPA nhiều view. `index.html` trở thành vỏ YouTube:

```
<div class="ambient">
<div id="app">
  <header class="yt-topbar">   hamburger (mobile) | brand | search (căn giữa) | meta+avatar
  <div class="yt-body">
    <aside class="yt-sidebar">  Trang chủ · Có MV · Đang phát
    <main>
      <section id="view-home">   lưới thẻ
      <section id="view-watch">  2 cột (desktop) / 1 cột (mobile)
    </main>
  </div>
  <div class="yt-player-bar">   thanh phát đáy (chỉ hiện ở trang chủ)
</div>
<audio id="audio-el">
```

- Router view: `state.view ∈ { 'home', 'watch' }`. Topbar + sidebar luôn hiển thị; riêng trên mobile khi ở trang xem, topbar/sidebar thay bằng hàng nút "quay lại" + tiêu đề.
- Giữ nguyên các ID phần tử logic phát (disc-art, cover-img, mv-video, view-toggle, view-btn, progress, controls, volume, audio, stage-visual, ambient) để tái sử dụng tối đa code `js/app.js`.
- `#mini-player` cũ được thay bằng `.yt-player-bar` (giữ tinh thần logic cũ: bấm thanh mở trang xem, nút play nhỏ toggle).

**Hành vi khôi phục khi tải lại trang:** `restoreState()` giữ nguyên cơ chế hiện tại (nạp lại bài, vị trí, volume, shuffle/repeat, `wasPlaying`), nhưng **luôn mở ở view "Trang chủ"** — thẻ đang phát được đánh dấu active, thanh phát đáy hiển thị bài đã nạp. Người dùng bấm thanh phát đáy hoặc mục sidebar "Đang phát" để vào trang xem. (Lý do: không tự mở trang xem khi tải trang, giống YouTube không tự mở watch page.)

## 4. Trang chủ — lưới thẻ

- Lưới responsive `repeat(auto-fill, minmax(170px, 1fr))`; 30 thẻ bài hát.
- Thẻ (`.card-item`, giữ `data-id`):
  - Thumbnail vuông (ảnh bìa 800×800, `object-fit: cover`, không cắt) — giống YouTube Music.
  - Overlay thời lượng góc phải dưới (nền đen mờ, chữ 11px), đã có sẵn cơ chế nạp duration (`loadDurations`).
  - Badge "MV" góc phải trên (chỉ bài có `song.mv`), màu tím như `.mv-badge` hiện tại.
  - Bên dưới: tên bài (2 dòng clamp) + dòng "MCK".
  - Thẻ đang phát: viền accent + icon play/pause overlay trung tâm (hiện khi `.playing`).
- Search lọc lưới theo logic hiện tại (normalize không dấu, khớp tên bài); không kết quả → thông báo `#no-results`.
- Sidebar:
  - **Trang chủ** → hiện đủ 30 thẻ.
  - **Có MV** → chỉ hiện thẻ có `song.mv` (6 bài) — đây là chế độ hiển thị, không thêm logic mới đáng kể.
  - **Đang phát** → chuyển sang trang xem nếu đã có bài được chọn; nếu chưa có bài thì giữ nguyên và không làm gì (hoặc nhắc chọn bài).
- Mục sidebar active: nền accent tím nhạt + chữ trắng; icon SVG.

## 5. Trang xem

**Desktop (≥900px), 2 cột:**
- Cột trái (flex-1, min-width 0): `.stage-visual` (màn hình lớn, tỷ lệ 16:9 hoặc vuông tối đa ~70vh, chứa đĩa quay hoặc MV) → toggle **Ảnh | MV** (giữ kiểu segmented nhưng bo tròn, accent gradient khi active) → tên bài + phụ đề ("MCK · Có MV") → thanh tiến trình + thời gian → controls (shuffle/prev/play/next/repeat) → volume.
- Cột phải (360px, cố định): panel **"Danh sách phát"** — dạng hàng giống đề xuất YouTube (`.song-item` hiện tại: idx/thumb/tên/sub/duration/EQ). Bài đang phát: nền active + EQ nhấp nháy.
- Nút "quay lại" (←) góc trên bên trái cột player để về trang chủ.

**Mobile (<900px), 1 cột:**
- Hàng trên: nút ← quay lại + tiêu đề bài (elipsis).
- `.stage-visual` tối đa 40vh, tỷ lệ vuông.
- Điều khiển: toggle Ảnh|MV, tên bài, tiến trình, controls, volume.
- Cuộn xuống: mục **"Danh sách phát"** (cùng thành phần với desktop) — cuộn tự nhiên theo trang.

**Phím tắt:** Space = play/pause, mũi tên trái/phải = seek ±5s, mũi tên lên/xuống = volume, **Esc = quay về trang chủ** (nếu đang ở trang xem; không còn đóng stage như bố cục cũ).

## 6. Thanh phát đáy (.yt-player-bar)

- Chỉ hiển thị khi `state.view === 'home'` (và đã có bài được chọn). Ẩn khi ở trang xem.
- Vị trí: fixed, bottom (trên safe-area), desktop lẫn mobile; tràn ngang với padding nhỏ.
- Cấu trúc: vạch tiến trình mỏng (2px, fill accent gradient) ở mép trên của bar → hàng nội dung: thumb vuông 46px + tên bài (trái) | prev / play / next (giữa) | volume slider (phải, desktop; ẩn mobile vì đã có trong trang xem).
- Bấm vào vùng bar (không phải nút) → mở trang xem. Nút play nhỏ toggle play.
- Thay thế `.mini-player` cũ; giữ cùng cơ chế cập nhật progress/title/cover.

## 7. Thay đổi file

| File | Thay đổi |
|---|---|
| `index.html` | Viết lại vỏ shell: topbar, sidebar, view home + watch, player bar. Giữ `audio`, `ambient`, toàn bộ ID logic phát. Thêm nút hamburger/drawer (mobile). |
| `css/style.css` | Giữ tokens + hiệu ứng hiện có (đĩa, EQ, ambient, scrollbar, reduced-motion). Thêm/điều chỉnh: shell grid, sidebar, lưới thẻ, watch 2 cột, player bar, responsive breakpoints. Xóa CSS cũ không dùng (mini-player, layout stage cũ). |
| `js/app.js` | Thêm `state.view` + `showView()`; render lưới thẻ; gắn sidebar; gắn player bar (tái sử dụng transport/saveState/restoreState/handoff như cũ); gắn nút quay lại. Giữ nguyên media events, persistence, media session, keyboard. Bỏ logic mini-player cũ. |
| `sw.js` | **Không đổi.** |
| `js/data.js` | **Không đổi.** |

## 8. Kiểm thử

- Cập nhật bộ test Playwright (script ở `C:\Users\Admin\AppData\Local\Temp\opencode\verify-hvl.js`, chạy qua server `python -m http.server` + chờ `navigator.serviceWorker.ready` để media đi qua SW — đảm bảo Range/seek hoạt động).
- Các ca kiểm chính:
  1. Render đủ 30 thẻ; grid hiển thị đúng.
  2. Bấm thẻ → vào trang xem, đĩa hiển thị, bài phát (audio).
  3. View toggle Ảnh↔MV: chuyển liền mạch, đúng bài có/không có MV (6 bài).
  4. Search lọc grid; sidebar "Có MV" lọc đúng 6.
  5. Thanh phát đáy hiện ở trang chủ, ẩn ở trang xem; bấm bar mở trang xem; play/next hoạt động.
  6. Seek hoạt động (qua SW Range).
  7. Tải lại trang: khôi phục đúng bài + vị trí + chế độ xem.
  8. `node --check` app.js.
- Không bắt buộc nhưng cần kiểm tra tay trên điện thoại: phát nền khi khóa màn hình (MV tự chuyển về Ảnh), thanh phát đáy hiển thị đúng.

## 9. Ngoài phạm vi (out of scope)

- Không thêm tính năng mới (không lặp bài, không danh sách chờ tùy chỉnh, không bình luận/đăng ký...).
- Không thay đổi dữ liệu 30 bài.
- Không đụng service worker / cơ chế Range.
