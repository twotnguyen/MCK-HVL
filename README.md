# HVL-MCK

## Tổng quan

HVL-MCK là trình nghe nhạc web dành cho bộ sưu tập 30 bài hát MCK. Ứng dụng chạy hoàn toàn ở phía trình duyệt, không có backend, framework, package manager hoặc bước build.

Dự án được viết bằng HTML, CSS và JavaScript thuần, có giao diện tối responsive và hỗ trợ cài đặt dạng Progressive Web App (PWA) trong môi trường phù hợp.

## Tính năng

- Danh sách 30 bài hát, 30 ảnh và 6 bài có MV.
- Trang chủ dạng lưới và màn hình đang phát kèm danh sách phát.
- Tìm kiếm tiếng Việt không phân biệt dấu; có bộ lọc chỉ hiển thị bài có MV.
- Phát/tạm dừng, bài trước/sau, tua, âm lượng, shuffle và repeat (`off`, `all`, `one`).
- Chuyển giữa chế độ Ảnh và MV đối với các bài có video.
- Ghi nhớ bài hiện tại, vị trí phát, âm lượng, shuffle, repeat và chế độ hiển thị bằng `localStorage`.
- Media Session API cung cấp metadata và các nút điều khiển trên màn hình khóa khi trình duyệt hỗ trợ.
- Service Worker cache app shell và những media đã được tải, đồng thời xử lý HTTP Range để hỗ trợ tua khi phát từ cache.
- Giao diện responsive cho desktop và mobile, có hỗ trợ `prefers-reduced-motion`.

## Kiến trúc

Đây là ứng dụng web tĩnh. Các file JavaScript được nạp bằng thẻ `<script>` truyền thống và dùng chung các biến global; không có bundler hoặc module loader.

### Thứ tự nạp module

```text
js/data.js
    ↓
js/state.js
    ↓
js/render.js
    ↓
js/player.js
    ↓
js/events.js
```

- `data.js`: khai báo manifest `SONGS` cho 30 bài hát.
- `state.js`: hằng số, helper, DOM references và state dùng chung.
- `render.js`: render lưới bài hát, playlist, bộ lọc và đồng bộ trạng thái giao diện.
- `player.js`: engine phát nhạc, chuyển Ảnh/MV, transport controls, Media Session và persistence.
- `events.js`: gắn sự kiện, phím tắt, khôi phục state và khởi động ứng dụng.

Thứ tự này phải được giữ nguyên vì các file phía sau sử dụng global được khai báo bởi các file phía trước.

### Kiến trúc media

Ứng dụng sử dụng một nguồn âm thanh duy nhất:

- `<audio id="sound-el">` là phần tử duy nhất phát âm thanh.
- `<video id="audio-el">` và `<video id="mv-video">` đều bị tắt tiếng, chỉ cung cấp phần hình ảnh tương ứng với chế độ đang chọn.
- Khi đổi Ảnh/MV, `sound-el` đổi nguồn và tiếp tục từ vị trí gần nhất; phần video hiển thị được đồng bộ theo nguồn âm thanh.

Cách tổ chức này giúp tránh nhiều phần tử cùng phát tiếng và cải thiện khả năng tiếp tục phát khi ứng dụng chuyển sang nền. Hành vi phát nền cuối cùng vẫn phụ thuộc trình duyệt, hệ điều hành và chính sách tiết kiệm pin của thiết bị.

## Chạy trên máy tính

Không nên mở trực tiếp `index.html` bằng `file://`, vì Service Worker và một số API trình duyệt sẽ không hoạt động đúng.

Tại thư mục dự án, chạy một HTTP server cục bộ:

```powershell
cd D:\Documents\CODE\HVL
python -m http.server 8000
```

Nếu Windows chỉ có Python Launcher, dùng:

```powershell
py -m http.server 8000
```

Sau đó mở:

```text
http://localhost:8000
```

Không có bước cài dependency hoặc build.

## Cấu hình trang Donate

Nút `Donate` trên header mở `donate.html` trong tab mới để trình phát nhạc hiện tại không bị gián đoạn. Trang ưu tiên hai dịch vụ nâng cấp Google AI Pro, hỗ trợ tạo nội dung đơn từ Gmail khách hàng và hướng dẫn gửi minh chứng qua Zalo/Facebook. Phía dưới vẫn có luồng ủng hộ trực tiếp với mức tiền tùy chỉnh.

Tên, giá và mã chuyển khoản của từng dịch vụ được khai báo bằng các thuộc tính `data-title`, `data-price` và `data-code` trên `.service-option` trong `donate.html`.

Thông tin nhận donate được khai báo tập trung trong `DONATE_CONFIG` ở đầu file `js/donate.js`:

```javascript
const DONATE_CONFIG = {
  bankName: 'Tên ngân hàng',
  accountNumber: 'Số tài khoản',
  accountHolder: 'TÊN CHỦ TÀI KHOẢN',
  transferNote: 'HVL MCK DONATE',
  qrImage: 'images/donate-qr.png',
  contactEmail: 'email@example.com',
  zaloUrl: 'https://zalo.me/so-dien-thoai',
  facebookUrl: 'https://www.facebook.com/ten-tai-khoan',
};
```

Khi `bankName` và `accountNumber` còn trống, trang chủ động hiển thị trạng thái chưa cấu hình và hướng người dùng liên hệ qua email. Để bật QR, thêm ảnh QR vào thư mục `images/` rồi cập nhật `qrImage`; nếu muốn ảnh này có sẵn khi offline, thêm đường dẫn tương ứng vào `SHELL_ASSETS` trong `sw.js` và tăng phiên bản `SHELL_CACHE`.

## Truy cập từ điện thoại

Để thử giao diện và phát media trên điện thoại trong cùng mạng Wi-Fi:

1. Chạy server để lắng nghe trên mạng nội bộ:

   ```powershell
   python -m http.server 8000 --bind 0.0.0.0
   ```

2. Chạy `ipconfig` và tìm địa chỉ IPv4 của máy tính, ví dụ `192.168.1.20`.
3. Trên điện thoại, mở `http://192.168.1.20:8000`.
4. Nếu không kết nối được, kiểm tra Windows Firewall và xác nhận hai thiết bị đang dùng cùng mạng.

Địa chỉ HTTP qua IP LAN phù hợp để kiểm tra giao diện và media, nhưng không phải secure context. Trình duyệt yêu cầu Service Worker chạy trên một origin được xem là đáng tin cậy, chẳng hạn HTTPS hoặc `localhost`; vì vậy cài PWA và cache offline thường không hoạt động qua địa chỉ LAN này. Xem thêm tài liệu về [`ServiceWorkerContainer.register()`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register). Muốn kiểm thử đầy đủ trên điện thoại, hãy phục vụ dự án qua HTTPS với chứng chỉ được thiết bị tin cậy.

## PWA và nghe offline

Service Worker trong `sw.js` sử dụng hai cache:

- App shell: HTML, CSS, JavaScript, manifest và icon được cache để tải giao diện.
- Media: ảnh, file trong `MP4/` và `MV/` được ghi vào cache khi request nhận phản hồi đầy đủ với status `200`.

Khi media đã có trong cache, Service Worker có thể tạo phản hồi `206 Partial Content` từ dữ liệu đầy đủ để tua và khôi phục vị trí phát.

Lưu ý:

- Thư viện media không nằm trong danh sách precache khi cài Service Worker. Tuy nhiên, giao diện có đọc metadata của các file audio để hiển thị thời lượng, nên dữ liệu thực tế được tải/cache còn phụ thuộc cách trình duyệt và HTTP server xử lý request Range.
- Chỉ những media đã được lưu thành công mới có khả năng dùng lại khi offline.
- Tổng dung lượng audio và MV hiện khoảng 582 MB, chưa tính ảnh và app shell.
- Hạn mức lưu trữ do trình duyệt quản lý; cache có thể bị thu hồi khi thiết bị thiếu dung lượng.
- Font Be Vietnam Pro được tải từ Google Fonts. Khi offline và font chưa được cache bởi trình duyệt, ứng dụng dùng font hệ thống dự phòng.

## Phím tắt

Khi focus không nằm trong ô nhập liệu:

| Phím | Hành động |
| --- | --- |
| `Space` | Phát hoặc tạm dừng |
| `ArrowLeft` | Lùi 5 giây |
| `ArrowRight` | Tiến 5 giây |
| `ArrowUp` | Tăng âm lượng 5% |
| `ArrowDown` | Giảm âm lượng 5% |
| `Escape` | Từ màn hình đang phát quay về trang chủ |

## Cấu trúc thư mục

```text
HVL/
├── index.html             Giao diện và các phần tử media
├── donate.html            Trang ủng hộ dự án
├── css/
│   ├── style.css          Theme, layout và responsive styles của trình phát
│   └── donate.css         Giao diện responsive của trang Donate
├── js/
│   ├── data.js            Manifest 30 bài hát
│   ├── state.js           Helper, DOM references và state
│   ├── render.js          Render và đồng bộ UI
│   ├── player.js          Playback engine và persistence
│   ├── events.js          Event wiring và bootstrap
│   └── donate.js          Cấu hình và tương tác của trang Donate
├── images/                30 ảnh bài hát
├── MP4/                   30 file media dùng cho chế độ Audio/Ảnh
├── MV/                    6 video MV
├── icons/
│   └── icon.svg           Icon ứng dụng
├── manifest.json          Web App Manifest
├── sw.js                  Service Worker và HTTP Range cache
├── songs_list.txt         Danh sách tên bài hát nguồn
└── docs/                  Đặc tả và kế hoạch phát triển
```

Không đổi tên file trong `images/`, `MP4/` hoặc `MV/` mà không cập nhật trường tương ứng trong `js/data.js`.

## Giới hạn đã biết

- PWA, Service Worker và offline cache cần secure context; HTTP qua IP LAN thường không đáp ứng điều kiện này.
- Phát nền và điều khiển màn hình khóa phụ thuộc hỗ trợ [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) cũng như chính sách của trình duyệt/hệ điều hành.
- Cache media không có giao diện quản lý hoặc giới hạn dung lượng riêng.
- Repository chưa có test suite tự động hay kiểm thử trình duyệt được check-in.
- SVG là icon duy nhất trong manifest; khả năng hiển thị/cài đặt có thể khác nhau giữa các nền tảng.

## Kiểm tra dành cho lập trình viên

Kiểm tra cú pháp toàn bộ JavaScript bằng PowerShell:

```powershell
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName }
node --check sw.js
```

Sau đó chạy server và kiểm tra thủ công trên desktop lẫn mobile:

- Render đủ 30 bài và lọc đúng 6 bài có MV.
- Phát, tạm dừng, seek, shuffle và ba trạng thái repeat.
- Chuyển Ảnh/MV mà không phát chồng âm thanh.
- Tải lại trang và xác nhận bài/vị trí/âm lượng được khôi phục.
- Kiểm tra Media Session và phát nền trên thiết bị thật.
- Sau khi một bài đã tải qua Service Worker, thử lại bài đó khi offline.
