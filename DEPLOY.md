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
