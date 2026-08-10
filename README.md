# HVL-MCK

<p align="center">
  <img src="images/logo.jpg" width="112" height="112" alt="Logo HVL-MCK" />
</p>

<p align="center">
  Trình phát nhạc web dành cho bộ sưu tập 30 ca khúc của MCK, xây dựng hoàn toàn bằng HTML, CSS và JavaScript thuần.
</p>

<p align="center">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white" />
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?logo=css&logoColor=white" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=111" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white" />
  <img alt="No build" src="https://img.shields.io/badge/build-không_cần-22c55e" />
</p>

## Giới thiệu

HVL-MCK là một ứng dụng nghe nhạc tĩnh, responsive và có khả năng cài đặt dưới dạng Progressive Web App (PWA) trên trình duyệt hỗ trợ. Dự án không sử dụng framework, backend, package manager hoặc quy trình build: chỉ cần một HTTP server là có thể chạy.

Ngoài trình phát nhạc, dự án còn có trang Donate độc lập với ba hình thức hỗ trợ:

- Đăng ký dịch vụ nâng cấp Google AI Pro theo gói cá nhân hoặc gia đình.
- Đặt dịch vụ coding theo yêu cầu (web mới, sửa lỗi, tool tự động hóa, tích hợp tùy chỉnh) — không niêm yết giá, liên hệ trực tiếp để trao đổi và báo giá.
- Ủng hộ trực tiếp qua MoMo hoặc ngân hàng ACB với QR thay đổi theo mệnh giá.

## Tính năng nổi bật

### Trình phát nhạc

- Bộ sưu tập 30 bài hát, trong đó có 6 bài kèm MV.
- Giao diện lưới bài hát và màn hình đang phát có danh sách phát riêng.
- Tìm kiếm tiếng Việt không phân biệt dấu và lọc nhanh các bài có MV.
- Điều khiển phát/tạm dừng, bài trước/sau, tua, âm lượng, shuffle và repeat.
- Chuyển đổi giữa chế độ ảnh và MV mà không phát chồng nhiều nguồn âm thanh.
- Ghi nhớ bài đang nghe, thời điểm phát, âm lượng, chế độ lặp, shuffle và giao diện bằng `localStorage`.
- Hỗ trợ Media Session API để hiển thị metadata và điều khiển trên màn hình khóa khi thiết bị cho phép.
- Hỗ trợ bàn phím, giao diện mobile và `prefers-reduced-motion`.

### PWA và media

- Web App Manifest cho phép cài ứng dụng ở chế độ standalone.
- Service Worker cache app shell theo chiến lược cache-first kết hợp cập nhật từ mạng.
- Audio, MV và ảnh nội dung được stream trực tiếp, không lưu lâu dài vào Cache Storage.
- Hỗ trợ phản hồi `206 Partial Content` khi server cục bộ không xử lý tốt HTTP Range.
- Tối đa ba media đầy đủ được giữ tạm trong bộ nhớ để hỗ trợ tua; dữ liệu này mất khi phiên trình duyệt kết thúc.

### Trang Donate

- Thanh điều hướng "3 cách ủng hộ" ngay sau phần hero, liên kết nhanh tới từng phần bên dưới.
- Cả ba phần đều theo cùng một cấu trúc: chọn lựa chọn → trang hiện khối hành động tương ứng (thanh toán hoặc liên hệ).

**1. Nâng cấp Google AI Pro**
- Hai gói: tài khoản chính chủ và chủ nhóm gia đình.
- Không chọn sẵn dịch vụ khi mở trang; phần đăng ký chỉ hiện sau khi người dùng chọn gói.
- Có thể bấm lại dịch vụ đang chọn để bỏ chọn và thu gọn trang.
- Quyền lợi, giá, QR MoMo và QR ACB tự cập nhật theo gói 50.000đ hoặc 250.000đ.
- Nút sao chép riêng cho số MoMo và từng trường thông tin chuyển khoản ACB.

**2. Coding theo yêu cầu**
- Bốn hạng mục: web/landing page mới, sửa lỗi & tối ưu, tool/script tự động hóa, tính năng & tích hợp tùy chỉnh.
- Không niêm yết giá; chọn hạng mục để hiện danh sách thông tin nên chuẩn bị trước và các kênh liên hệ trực tiếp (Zalo, Facebook, Email).
- Email liên hệ tự điền sẵn tiêu đề và nội dung theo hạng mục đã chọn.

**3. Ủng hộ trực tiếp**
- Ba mức ủng hộ: 10.000đ, 20.000đ và 30.000đ.
- QR MoMo/ACB thay đổi theo mệnh giá, chuyển đổi bằng tab, kèm nút tải ảnh.
- Kênh gửi minh chứng qua Zalo/Facebook, hoặc liên hệ email.

## Bắt đầu nhanh

### Yêu cầu

- Một trình duyệt hiện đại.
- Python 3 hoặc một HTTP server tĩnh tương đương.
- Node.js chỉ cần thiết khi muốn chạy kiểm tra cú pháp JavaScript.

### Chạy dự án

```powershell
git clone https://github.com/twotnguyen/MCK-HVL.git
cd MCK-HVL
python -m http.server 8000
```

Nếu Windows chỉ có Python Launcher:

```powershell
py -m http.server 8000
```

Mở `http://localhost:8000` trong trình duyệt.

> Không nên mở trực tiếp `index.html` bằng giao thức `file://`, vì Service Worker và một số API trình duyệt sẽ không hoạt động đúng.

## Kiến trúc

Dự án dùng các thẻ `<script>` truyền thống. Các file JavaScript chia sẻ state qua phạm vi global, vì vậy thứ tự nạp trong `index.html` phải được giữ nguyên:

```text
data.js → state.js → render.js → player.js → events.js
```

| File | Trách nhiệm |
| --- | --- |
| `js/data.js` | Khai báo manifest `SONGS` và đường dẫn media cho 30 bài hát. |
| `js/state.js` | Hằng số, helper, DOM reference và state dùng chung. |
| `js/render.js` | Render lưới bài hát, playlist, bộ lọc và trạng thái UI. |
| `js/player.js` | Playback engine, đồng bộ ảnh/MV, Media Session và persistence. |
| `js/events.js` | Gắn sự kiện, phím tắt, khôi phục state và khởi động ứng dụng. |
| `js/donate.js` | Cấu hình thanh toán, chọn dịch vụ, đổi QR và thao tác sao chép. |
| `sw.js` | Cache app shell, stream media và xử lý HTTP Range. |

### Luồng phát media

Ứng dụng sử dụng một nguồn âm thanh chính:

- `<audio id="sound-el">` phát toàn bộ âm thanh.
- Các phần tử video được tắt tiếng và chỉ cung cấp hình ảnh cho chế độ Audio/MV.
- Khi đổi chế độ, nguồn âm thanh tiếp tục ở vị trí gần nhất và video được đồng bộ theo thời gian phát.

Cách tổ chức này tránh phát chồng âm thanh. Khả năng phát nền vẫn phụ thuộc trình duyệt, hệ điều hành và chính sách tiết kiệm pin của thiết bị.

## Cấu hình nội dung

### Danh sách bài hát

Mỗi bài hát được khai báo trong mảng `SONGS` tại `js/data.js`:

```javascript
{
  id: 1,
  title: "Elegie",
  artist: "MCK",
  image: "1_Elegie.jpg",
  audio: "1_Elegie.mp4",
  mv: null,
}
```

- `image` trỏ tới file trong `images/`.
- `audio` trỏ tới file trong `MP4/`.
- `mv` trỏ tới file trong `MV/`; dùng `null` nếu bài hát không có MV.

Không đổi tên media nếu chưa cập nhật đường dẫn tương ứng trong `js/data.js`.

### Trang Donate

Thông tin nhận thanh toán nằm trong `DONATE_CONFIG` ở đầu `js/donate.js`:

```javascript
const DONATE_CONFIG = {
  bankName: 'ACB',
  accountNumber: '23992227',
  accountHolder: 'Nguyễn Ngọc Tình',
  momoPhone: '0369861439',
  transferNote: 'HVL MCK DONATE',
  bankQrByAmount: {
    10000: 'images/10k_ACB.jpg',
    20000: 'images/20k_ACB.jpg',
    30000: 'images/30K_ACB.jpg',
  },
  momoQrByAmount: {
    10000: 'images/10k_momo.jpg',
    20000: 'images/20k-momo.jpg',
    30000: 'images/30k_momo.jpg',
  },
  serviceQrByAmount: {
    50000: {
      momo: 'images/50k_momo.jpg',
      bank: 'images/50k_ACB.jpg',
    },
    250000: {
      momo: 'images/250k_momo.jpg',
      bank: 'images/250k_ACB.jpg',
    },
  },
};
```

Tên, giá và mã của từng dịch vụ được khai báo bằng `data-title`, `data-price` và `data-code` trên các nút `.service-option` trong `donate.html`.

Khi thay đổi file thuộc app shell, hãy tăng phiên bản `SHELL_CACHE` trong `sw.js` để thiết bị nhận bản mới.

## Phím tắt

Các phím tắt hoạt động khi focus không nằm trong ô nhập liệu:

| Phím | Hành động |
| --- | --- |
| `Space` | Phát hoặc tạm dừng. |
| `ArrowLeft` | Lùi 5 giây. |
| `ArrowRight` | Tiến 5 giây. |
| `ArrowUp` | Tăng âm lượng 5%. |
| `ArrowDown` | Giảm âm lượng 5%. |
| `Escape` | Quay từ màn hình đang phát về trang chủ. |

## Cấu trúc thư mục

```text
MCK-HVL/
├── index.html              Trang trình phát nhạc
├── donate.html             Trang dịch vụ và ủng hộ dự án
├── css/
│   ├── style.css           Giao diện trình phát
│   └── donate.css          Giao diện trang Donate
├── js/
│   ├── data.js             Danh sách 30 bài hát
│   ├── state.js            State và DOM reference
│   ├── render.js           Render và đồng bộ UI
│   ├── player.js           Playback engine
│   ├── events.js           Event wiring và bootstrap
│   └── donate.js           Logic dịch vụ và thanh toán
├── images/                 Ảnh bìa, logo và QR thanh toán
├── MP4/                    30 file audio đóng gói MP4
├── MV/                     6 video MV
├── manifest.json           Web App Manifest
├── sw.js                   Service Worker
└── songs_list.txt          Danh sách tên bài hát nguồn
```

## Truy cập từ điện thoại

Để kiểm tra trong cùng mạng Wi-Fi:

```powershell
python -m http.server 8000 --bind 0.0.0.0
ipconfig
```

Tìm IPv4 của máy tính, sau đó mở `http://<IPv4>:8000` trên điện thoại.

HTTP qua địa chỉ LAN phù hợp để thử giao diện và media nhưng không phải secure context. Việc cài PWA và đăng ký Service Worker ổn định cần HTTPS hoặc `localhost`.

## Triển khai

Đây là website tĩnh nên có thể triển khai trực tiếp lên GitHub Pages, Netlify, Vercel hoặc bất kỳ máy chủ hỗ trợ HTTPS và HTTP Range.

Khi triển khai cần bảo đảm:

- Giữ nguyên cấu trúc và chữ hoa/thường của đường dẫn media.
- Máy chủ trả đúng MIME type cho HTML, CSS, JavaScript, ảnh và MP4.
- Máy chủ hỗ trợ byte-range request để tua media hiệu quả.
- Service Worker được phục vụ cùng origin và trong phạm vi chứa ứng dụng.
- HTTPS được bật trên môi trường production.

## Kiểm tra dành cho lập trình viên

Kiểm tra cú pháp JavaScript bằng PowerShell:

```powershell
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName }
node --check sw.js
git diff --check
```

Checklist kiểm tra thủ công:

- Hiển thị đủ 30 bài và lọc đúng 6 bài có MV.
- Tìm kiếm hoạt động với từ khóa tiếng Việt có hoặc không dấu.
- Phát, tạm dừng, tua, đổi bài, shuffle và ba trạng thái repeat hoạt động đúng.
- Chuyển Ảnh/MV không gây phát chồng âm thanh.
- Tải lại trang vẫn khôi phục trạng thái phát đã lưu.
- Chọn, đổi và bỏ chọn dịch vụ Donate (nâng cấp tài khoản và coding theo yêu cầu) hoạt động đúng.
- QR và số tiền đổi đúng theo từng gói; các nút sao chép và tải QR hoạt động.
- Giao diện không tràn ở kích thước desktop và mobile phổ biến.

## Giới hạn hiện tại

- Chưa có backend hoặc cổng thanh toán tự động; người dùng cần gửi minh chứng giao dịch.
- Media không được lưu offline lâu dài và cần kết nối mạng để phát trong phiên mới.
- Hỗ trợ Media Session và phát nền khác nhau giữa các trình duyệt/hệ điều hành.
- Chưa có test suite tự động hoặc pipeline CI được lưu trong repository.
- Dự án chưa khai báo giấy phép mã nguồn riêng.

## Ghi chú nội dung

Các tên nghệ sĩ, bài hát, hình ảnh và video thuộc quyền sở hữu của chủ sở hữu tương ứng. Dự án này không tuyên bố quyền sở hữu đối với các nội dung media đó.
