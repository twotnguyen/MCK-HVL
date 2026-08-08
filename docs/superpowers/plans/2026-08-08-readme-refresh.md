# MCK Player README Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Viết lại `README.md` thành tài liệu tiếng Việt đầy đủ, thực dụng và khớp với kiến trúc hiện tại của MCK Player.

**Architecture:** Đây là thay đổi tài liệu đơn file. README mô tả trực tiếp cấu trúc SPA/PWA không build, chuỗi module JavaScript hiện tại và mô hình một nguồn âm thanh; mọi tuyên bố được đối chiếu với repository trước khi bàn giao.

**Tech Stack:** Markdown, vanilla HTML/CSS/JavaScript, Service Worker, Media Session API.

## Global Constraints

- Chỉ sửa `README.md`; không sửa mã nguồn hoặc media.
- Viết bằng tiếng Việt, ngắn gọn nhưng đủ để người dùng làm theo.
- Không nhắc `js/app.js` như file đang tồn tại.
- Không khẳng định MV tự chuyển sang Ảnh khi khóa màn hình.
- Không đảm bảo PWA/Service Worker hoạt động qua HTTP trên IP LAN; nêu rõ cần HTTPS hoặc localhost trong phần lớn trình duyệt.
- Không thêm công cụ build, package manager, badge hoặc test suite không có trong repository.

---

### Task 1: Viết lại và kiểm chứng README

**Files:**
- Modify: `README.md`
- Reference: `index.html`, `manifest.json`, `sw.js`, `js/data.js`, `js/state.js`, `js/render.js`, `js/player.js`, `js/events.js`

**Interfaces:**
- Consumes: cấu trúc file hiện tại, `SONGS`, `state`, DOM media và chiến lược cache trong Service Worker.
- Produces: một README độc lập, chứa hướng dẫn chạy, kiến trúc, tính năng, giới hạn và kiểm tra phát triển.

- [x] **Step 1: Thay nội dung README bằng cấu trúc đã duyệt**

README phải có các mục theo thứ tự:

```markdown
# MCK Player
## Tổng quan
## Tính năng
## Kiến trúc
### Thứ tự nạp module
### Kiến trúc media
## Chạy trên máy tính
## Truy cập từ điện thoại
## PWA và nghe offline
## Phím tắt
## Cấu trúc thư mục
## Giới hạn đã biết
## Kiểm tra dành cho lập trình viên
```

Nội dung phải ghi đúng các dữ kiện: 30 bài audio, 30 ảnh, 6 MV; không có build step; `sound-el` là nguồn âm thanh duy nhất; media được cache khi tải; tổng media lớn nên cache có thể bị trình duyệt thu hồi; Service Worker cần secure context; test cú pháp dùng `node --check`.

- [x] **Step 2: Xác nhận mọi file được README nhắc tới đều tồn tại**

Run:

```powershell
$readmePaths = @('index.html','css/style.css','js/data.js','js/state.js','js/render.js','js/player.js','js/events.js','manifest.json','sw.js','icons/icon.svg','images','MP4','MV'); $missingPaths = @($readmePaths | Where-Object { -not (Test-Path -LiteralPath $_) }); if ($missingPaths.Count) { throw "Missing: $($missingPaths -join ', ')" } else { "All documented paths exist." }
```

Expected: `All documented paths exist.`

- [x] **Step 3: Kiểm tra các mô tả lỗi thời đã bị loại bỏ**

Run:

```powershell
$readmeText = Get-Content -Raw -Encoding UTF8 README.md; if ($readmeText -match 'js/app\.js|tự động chuyển về chế độ Ảnh') { throw 'README still contains obsolete behavior.' } else { 'No obsolete behavior found.' }
```

Expected: `No obsolete behavior found.`

- [x] **Step 4: Kiểm tra cú pháp mã nguồn được README mô tả**

Run:

```powershell
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName }; node --check sw.js
```

Expected: exit code `0` và không có lỗi cú pháp.

- [x] **Step 5: Rà soát diff và phạm vi thay đổi**

Run:

```powershell
git diff --check -- README.md
git diff -- README.md
git status --short
```

Expected: README không có lỗi whitespace; diff chỉ chứa nội dung tài liệu dự kiến. Các thay đổi có sẵn trong `css/style.css`, `index.html`, `js/data.js` và `image.png` không được đưa vào thay đổi README.

- [x] **Step 6: Commit riêng README và kế hoạch**

Run:

```powershell
git add -- README.md docs/superpowers/plans/2026-08-08-readme-refresh.md
git diff --cached --check
git commit -m "docs: refresh project README"
```

Expected: commit chỉ chứa `README.md` và file kế hoạch này.
