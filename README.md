# MCK Player

Trang web nghe nhạc offline cho 30 bài hát MCK — giao diện tối, responsive, phát nền trên điện thoại.

## Chạy thử trên máy tính

Không mở trực tiếp `index.html` bằng cách double-click (một số trình duyệt chặn Service Worker/PWA trên `file://`). Hãy chạy một web server đơn giản trong thư mục này:

```
cd D:\Documents\CODE\HVL
python -m http.server 8000
```

Rồi mở trình duyệt tại: `http://localhost:8000`

## Mở trên điện thoại (cùng mạng Wi-Fi)

1. Đảm bảo điện thoại và máy tính **cùng một mạng Wi-Fi**.
2. Trên máy tính, lấy địa chỉ IP nội bộ: mở PowerShell, chạy `ipconfig`, tìm dòng "IPv4 Address" (dạng `192.168.x.x`).
3. Chạy server như trên (`python -m http.server 8000`).
4. Trên điện thoại, mở trình duyệt và truy cập: `http://192.168.x.x:8000` (thay bằng IP thật của máy tính).
5. (Tuỳ chọn) Chọn "Thêm vào màn hình chính" / "Add to Home Screen" để cài như một app — giúp phát nhạc nền ổn định hơn khi khoá màn hình.

## Tính năng

- Danh sách 30 bài hát, tên hiển thị đúng như `songs_list.txt`, tìm kiếm không phân biệt dấu.
- Mặc định phát audio từ thư mục `MP4/`, ảnh bìa từ `images/` hiển thị làm hình nền "Đang phát".
- Với 6 bài có MV (IDK, Slippery, Nhìn Kẻ Thù Của Tao, Mắt Môi Tay Chân, Xa Xôi, Oanh M = Thuoc), có thể bấm nút "MV" để chuyển sang xem video; bấm "Ảnh" để quay lại ảnh bìa.
- Phát nhạc nền khi tắt màn hình điện thoại: dùng Media Session API để hiện điều khiển trên màn hình khoá; nếu đang xem MV mà khoá máy, tự động chuyển về chế độ Ảnh để nhạc không bị dừng.
- Shuffle, lặp lại (tắt/toàn bộ/1 bài), tua bài, chỉnh âm lượng, ghi nhớ bài đang phát + vị trí khi tải lại trang.
- Giao diện tối, glassmorphism, font "Be Vietnam Pro", icon SVG, đĩa vinyl xoay, ambient glow theo ảnh bìa bài đang phát; responsive: máy tính hiển thị danh sách + panel phát nhạc song song; điện thoại hiển thị danh sách + thanh mini-player, bấm vào để mở toàn màn hình (có chỉnh âm lượng).
- Service worker cache lại các bài đã phát để nghe lại khi mất mạng, và tự xử lý HTTP Range để tua bài/khôi phục vị trí chính xác kể cả khi chạy bằng `python -m http.server`.

## Cấu trúc file

```
index.html        giao diện chính
css/style.css      style
js/data.js         danh sách 30 bài hát (tự sinh từ songs_list.txt)
js/app.js          logic phát nhạc
manifest.json, sw.js, icons/  hỗ trợ cài đặt PWA
images/, MP4/, MV/  dữ liệu gốc (không đổi tên)
```
