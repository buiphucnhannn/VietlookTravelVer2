/**
 * Ảnh Cloudinary lỗi tạm thời (lần ĐẦU yêu cầu 1 kích thước, Cloudinary phải tạo bản đó ngay — khi nhiều ảnh
 * mới cùng lúc đôi khi trả lỗi) → tự tải lại tối đa 4 lần (1.5s, 4s, 8s, 15s).
 * Chỉ sửa thẻ <img> SAU khi trang tải xong (sự kiện load) → không đụng HTML lúc React đang khởi động (tránh cảnh báo hydration).
 *
 * Là <script> nhỏ chạy NGAY khi HTML được đọc (trước cả khi React khởi động) → bắt được cả ảnh lỗi trong lúc
 * trang đang tải. Chỉ áp dụng ảnh res.cloudinary.com; tham số `_r` chỉ để trình duyệt không dùng lại phản hồi lỗi.
 * Nội dung script cố định (không chèn dữ liệu người dùng) → an toàn.
 */
export const IMAGE_RETRY_SCRIPT = `(function(){var D=[1500,4000,8000,15000];function later(f,d){if(document.readyState==="complete")setTimeout(f,d);else window.addEventListener("load",function(){setTimeout(f,d)},{once:true})}function w(u,n){if(!u)return u;return u.split(",").map(function(p){var a=p.trim().split(/\\s+/);if(a[0].indexOf("res.cloudinary.com")<0)return p.trim();var c=a[0].replace(/[?&]_r=\\d+/,"");a[0]=c+(c.indexOf("?")<0?"?":"&")+"_r="+n;return a.join(" ")}).join(", ")}document.addEventListener("error",function(e){var i=e.target;if(!i||i.tagName!=="IMG")return;var s=i.currentSrc||i.src||"";if(s.indexOf("res.cloudinary.com")<0)return;var n=+(i.getAttribute("data-retry")||0);if(n>=D.length)return;later(function(){i.setAttribute("data-retry",n+1);if(i.srcset)i.srcset=w(i.srcset,n+1);i.src=w(i.src,n+1)},D[n])},true)})();`;

// Dùng trong root layout (app/[lang]/layout.js, app/(system)/layout.js):
//   <Script id="vl-image-retry" strategy="beforeInteractive">{IMAGE_RETRY_SCRIPT}</Script>
// next/script "beforeInteractive" chèn script vào <head> của HTML ban đầu (chạy trước khi ảnh tải và trước React)
// → không render thẻ <script> trong cây React (tránh cảnh báo "Encountered a script tag while rendering").
