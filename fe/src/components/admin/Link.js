import NextLink from "next/link";

/**
 * Link trong khu quản trị: KHÔNG tải trước (prefetch).
 * Mỗi lượt tải trước đều đi qua bước kiểm tra đăng nhập → một trang có 20 link sẽ tốn 20 lượt gọi,
 * người quản trị làm việc nhanh sẽ chạm giới hạn chống spam và bị tạm khoá.
 */
export default function Link(props) {
  return <NextLink prefetch={false} {...props} />;
}
