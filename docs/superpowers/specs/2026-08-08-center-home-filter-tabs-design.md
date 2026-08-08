# MCK Player — Thiết kế căn giữa tab bộ lọc trang chủ

- Ngày: 2026-08-08
- Phạm vi: căn giữa nhóm tab `Tất cả | Có MV` trên trang chủ.

## Mục tiêu

Giữ tiêu đề `Trang chủ` căn trái như hiện tại và căn giữa nhóm tab bộ lọc theo chiều ngang của vùng nội dung trên cả desktop lẫn mobile.

## Thiết kế

- Chỉ chỉnh rule `.filter-group` trong `css/style.css`.
- Giữ `display: flex` và khoảng cách hiện tại giữa hai tab.
- Thêm `width: 100%` để nhóm bộ lọc chiếm chiều ngang khả dụng.
- Thêm `justify-content: center` để hai nút nằm chính giữa.
- Không thay đổi markup trong `index.html`, logic lọc trong JavaScript hoặc style riêng của `.filter-pill`.

## Hành vi responsive

Cùng một rule áp dụng ở mọi breakpoint. Hai tab ngắn nên không cần cơ chế wrap hoặc style mobile riêng. Tiêu đề vẫn nằm trên dòng trước và giữ căn trái.

## Kiểm chứng

- Xác nhận `.filter-group` có `width: 100%` và `justify-content: center`.
- Xác nhận `index.html` và JavaScript không bị thay đổi bởi task này.
- Kiểm tra giao diện trang chủ ở viewport desktop và mobile nếu công cụ trình duyệt khả dụng.
- Chạy kiểm tra cú pháp JavaScript hiện có để phát hiện lỗi baseline không liên quan.
- Rà `git diff` để bảo đảm phần thay đổi của task chỉ là hai declaration trong rule `.filter-group`; giữ nguyên mọi thay đổi có sẵn của người dùng.
