// Bảng giá lấy từ website cũ có cấu trúc không đều (ô gộp dọc, dòng chú thích, không có dòng tiêu đề).
// Chuẩn hoá trước khi hiển thị để mọi bảng đều thẳng hàng, dễ đọc.

// Là giá khi có số đi kèm đơn vị tiền ("28 USD", "144$", "$95") hoặc số từ 3 chữ số;
// "Price (USD/PAX)" (tiêu đề cột) không phải giá
const hasPrice = (c) => /\d[\d.,]*\s*(USD|\$)|\$\s*\d|\d{3}/i.test(c || "");

/**
 * - Dòng đầu chỉ có 1 ô trong khi bảng nhiều cột → coi là chú thích (caption).
 * - Dòng thiếu ô (do ô gộp dọc ở bảng gốc) → các ô còn lại được đặt vào cột giá,
 *   các cột khác gộp với dòng trên (rowSpan).
 * - Dòng đầu chứa giá → bảng không có dòng tiêu đề.
 */
export function normalizeTable(rows) {
  let body = rows.filter((r) => r.some((c) => String(c).trim()));
  // Cột đầu chỉ toàn số thứ tự (1, 2, 3…) của bảng gốc → bỏ
  const multi = body.filter((r) => r.length > 1);
  if (multi.length > 1 && multi.every((r) => /^\d{1,2}$/.test(String(r[0]).trim()))) {
    body = body.map((r) => (r.length > 1 ? r.slice(1) : r));
  }
  const width = Math.max(...body.map((r) => r.length));
  let caption = null;
  if (width > 1 && body[0]?.length === 1) {
    caption = body[0][0];
    body = body.slice(1);
  }

  // Lưới ô: { text, rowSpan } hoặc null (ô bị gộp vào dòng trên)
  const grid = [];
  body.forEach((row, i) => {
    if (row.length >= width || i === 0) {
      grid.push(Array.from({ length: width }, (_, j) => ({ text: row[j] ?? "", rowSpan: 1 })));
      return;
    }
    const prev = body[i - 1].length >= width ? body[i - 1] : body.find((r) => r.length >= width);
    const start = Math.max(0, prev ? prev.findIndex(hasPrice) : 0);
    const cells = Array.from({ length: width }, (_, j) =>
      j >= start && j < start + row.length ? { text: row[j - start], rowSpan: 1 } : null,
    );
    // Cột không có dữ liệu → kéo dài ô gần nhất phía trên
    cells.forEach((c, j) => {
      if (c) return;
      for (let k = grid.length - 1; k >= 0; k--) {
        if (grid[k][j]) {
          grid[k][j].rowSpan += 1;
          break;
        }
      }
    });
    grid.push(cells);
  });

  const header = grid.length > 1 && !body[0].some(hasPrice) ? grid[0] : null;
  return { caption, header, rows: header ? grid.slice(1) : grid };
}

export default function PriceTable({ table }) {
  const { caption, header, rows } = normalizeTable(table.rows);
  const heading = [table.heading !== "Price" && table.heading, caption].filter(Boolean).join(" · ");

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-border">
      {heading && (
        <p className="bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">{heading}</p>
      )}
      <table className="w-full text-left text-sm">
        {header && (
          <thead className="bg-brand-50 text-brand-800">
            <tr>
              {header.map((h, j) => (
                <th key={j} className="px-4 py-3 align-top font-semibold">
                  {h.text}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border first:border-t-0">
              {r.map((cell, k) =>
                cell ? (
                  <td
                    key={k}
                    rowSpan={cell.rowSpan}
                    className={
                      hasPrice(cell.text) && cell.text.length < 40
                        ? "px-4 py-3 align-top font-semibold whitespace-nowrap text-sun-600"
                        : k === 0
                          ? "px-4 py-3 align-top font-medium text-ink"
                          : "min-w-56 px-4 py-3 align-top text-ink/80"
                    }
                  >
                    {cell.text}
                  </td>
                ) : null,
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
