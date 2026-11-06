# Lưu trữ dữ liệu & Deploy

## Dữ liệu nằm ở đâu
- `content.json` — toàn bộ nội dung (đây là "database").
- `uploads/` — ảnh tải lên từ CMS.
- Cả hai được commit vào Git → GitHub giữ bản lưu, có lịch sử phiên bản, miễn phí.
- `backups/` chỉ là bản sao lưu trên máy, không đẩy lên GitHub.

## Quy trình cập nhật
1. `node server.js` → sửa nội dung tại http://127.0.0.1:3000/admin
2. `git add content.json uploads && git commit -m "Update content" && git push`
3. GitHub Actions tự chạy `node build.js` và deploy `dist/` lên GitHub Pages.

Lần đầu: vào Settings → Pages → Source: **GitHub Actions**.

## Xem thử bản build
- `node build.js` → tạo `dist/`
- `node tools/preview-dist.js` → http://127.0.0.1:4000/NamNguyenDesign/

`admin.html`, `server.js`, `backups/` không bao giờ được đưa vào `dist/`.
