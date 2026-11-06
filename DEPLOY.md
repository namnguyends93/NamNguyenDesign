# Lưu trữ dữ liệu & Deploy

## Dữ liệu nằm ở đâu
- `content.json` — toàn bộ nội dung (đây là "database").
- `uploads/` — ảnh gốc tải lên từ CMS.
- Cả hai được commit vào Git → GitHub giữ bản lưu, có lịch sử phiên bản, miễn phí.
- `backups/` chỉ là bản sao lưu trên máy, không đẩy lên GitHub.

## Cài lần đầu
`npm install`

## Quy trình cập nhật
1. `npm run dev` → sửa nội dung tại http://127.0.0.1:3000/admin
2. `npm run build` rồi `npm run preview` → xem bản tối ưu tại http://127.0.0.1:4000/NamNguyenDesign/
3. `git add -A && git commit -m "Update content" && git push`
4. GitHub Actions tự build và deploy lên https://namnguyends93.github.io/NamNguyenDesign/

## Bản build làm gì (build.js)
- Prerender: ghi sẵn nội dung `content.json` vào HTML → không nháy chữ, không tải thêm JSON/JS.
- Ảnh: mọi ảnh (uploads/ và ảnh Framer) được tải về, đổi sang WebP 800px + bản lớn, có srcset,
  width/height và lazy-load cho ảnh dưới màn hình đầu. Ảnh tải về được cache ở `.cache/`.
- Nén HTML, CSS và JS inline.
- `admin.html`, `server.js`, `backups/`, `content.json` không bao giờ được đưa vào `dist/`.

## Trang chi tiết project — module

Trang `projects/<slug>.html` được **tự tạo từ `content.json`** (file `project-template.js`).
Mỗi trang = Hero + danh sách **module** + "Next project". Project mới mặc định là mẫu 3 · Tiêu chuẩn
(Overview → Gallery → Statement); cần gì thì **+ Thêm module**, đổi thứ tự bằng ↑ ↓, xoá bằng ✕.

Module có sẵn: Overview · Giới thiệu ngắn · Gallery ảnh (4 kiểu lưới) · Ảnh tràn màn hình ·
Chữ + ảnh (2 cột) · Đoạn chữ · 3 thẻ quy trình · Statement · Credits.

5 mẫu dựng sẵn (nút **Áp mẫu**, giữ lại ảnh + chữ đang có): 1 Tối giản (~3 màn hình) · 2 Gọn (~4) ·
3 Tiêu chuẩn (~7) · 4 Câu chuyện (~8) · 5 Trưng bày (~10).

Module trống tự ẩn. Xem live: nút **Xem trang ↗** trong admin (Save trước).
Xem 5 mẫu cạnh nhau: `npm run build`, `npm run demo`, `npm run preview` →
http://127.0.0.1:4000/NamNguyenDesign/demo-overview.html
