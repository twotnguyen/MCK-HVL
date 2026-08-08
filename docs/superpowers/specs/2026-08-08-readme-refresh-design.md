# MCK Player — Thiết kế cập nhật README

- Ngày: 2026-08-08
- Phạm vi: chỉ cập nhật `README.md`; không thay đổi mã nguồn hay tài nguyên media.

## Mục tiêu

Viết lại README theo hướng đầy đủ và thực dụng, giúp người dùng chạy ứng dụng đúng cách và giúp lập trình viên hiểu nhanh kiến trúc hiện tại. Nội dung phải phản ánh mã nguồn đang có, không dựa vào các kế hoạch hoặc kiến trúc cũ.

## Cấu trúc nội dung

README mới gồm các phần sau:

1. Tổng quan dự án và đặc điểm công nghệ: web tĩnh/PWA, vanilla HTML/CSS/JavaScript, không có bước build.
2. Tính năng đang hoạt động: 30 bài hát, 6 MV, tìm kiếm không dấu, điều khiển phát, lưu trạng thái, Media Session, responsive và cache offline.
3. Kiến trúc module theo đúng thứ tự nạp: `data.js` → `state.js` → `render.js` → `player.js` → `events.js`.
4. Kiến trúc media hiện tại: `sound-el` là nguồn âm thanh duy nhất; hai phần tử video bị tắt tiếng và chỉ dùng để hiển thị hình ảnh.
5. Cách chạy trên máy tính bằng HTTP server cục bộ.
6. Cách truy cập từ điện thoại, kèm lưu ý rằng Service Worker/PWA thường cần HTTPS hoặc localhost; HTTP qua IP LAN không đảm bảo khả dụng.
7. Cách hoạt động và giới hạn của cache offline: media chỉ được cache sau khi được tải, tổng dữ liệu lớn và trình duyệt có thể thu hồi cache.
8. Phím tắt và điều khiển màn hình khóa.
9. Cấu trúc thư mục thực tế, thay `js/app.js` cũ bằng bốn module hiện tại.
10. Giới hạn đã biết và các kiểm tra phát triển tối thiểu.

## Nội dung cần loại bỏ hoặc sửa

- Xóa tham chiếu lỗi thời tới `js/app.js`.
- Không khẳng định ứng dụng tự chuyển từ MV sang Ảnh khi khóa màn hình; mã hiện tại giữ một nguồn âm thanh riêng để hỗ trợ phát nền.
- Không mô tả HTTP qua IP LAN như một môi trường PWA/offline được đảm bảo.
- Không thêm lệnh build, package manager, badge hoặc test suite chưa tồn tại.

## Yêu cầu trình bày

- Viết bằng tiếng Việt, ngắn gọn nhưng đủ để làm theo.
- Dùng tiêu đề và danh sách rõ ràng; tránh lặp lại cùng một tính năng ở nhiều phần.
- Mọi tên file, đường dẫn, số lượng bài hát/MV và phím tắt phải khớp repository.
- Phân biệt rõ khả năng đã có với giới hạn hoặc hành vi phụ thuộc trình duyệt.

## Kiểm chứng

- Đối chiếu toàn bộ đường dẫn được nhắc trong README với filesystem.
- Xác nhận README không còn `js/app.js` hoặc mô tả tự chuyển MV sang Ảnh khi ẩn trang.
- Chạy `node --check` cho toàn bộ `js/*.js` và `sw.js` để ghi nhận trạng thái cú pháp hiện tại; không tuyên bố có test trình duyệt nếu chưa chạy test trình duyệt.
- Kiểm tra `git diff -- README.md` và `git status --short` để bảo đảm chỉ thay đổi đúng phạm vi, ngoài các thay đổi người dùng đã có sẵn.
