"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Table2,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CROP_PRESETS, useImageCrop } from "./ImageCropper";
import {
  CREDIT_PREFIX,
  buildCredit,
  insertImages,
  licenseUrlFor,
  parseCredit,
} from "./richTextImage";
import { EXTERNAL_REL, createEditorExtensions } from "./richTextSchema";
import { NEW_TABLE, tidyEditorHtml } from "./richTextTable";
import { Button, Field, ImageUrlDialog, Input, Modal, Toggle, useUi } from "./ui";

/** Nút trên thanh công cụ (giữ vùng chọn khi bấm: preventDefault ở mousedown) */
function B({ on, title, onClick, icon: Icon, disabled, off }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || off}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-40",
        on && "bg-brand-50 text-brand-700",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

/** Nhóm nút trên thanh công cụ: xuống dòng theo cả nhóm (không tách lẻ nút), vạch ngăn bên phải */
function G({ children }) {
  return (
    <div className="mr-1 flex items-center gap-0.5 border-r border-slate-200 pr-1 last-of-type:border-r-0">
      {children}
    </div>
  );
}

/** Nút chữ trên dải công cụ bảng (hiện khi con trỏ đang ở trong bảng) */
function TB({ onClick, children, danger, title, on }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={on}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "h-7 rounded-md px-2 text-xs font-semibold text-slate-600 transition hover:bg-white hover:shadow-sm",
        danger && "text-sun-600 hover:text-sun-700",
        on && "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Trình soạn thảo nội dung (bài viết, lịch trình từng ngày, trang chính sách…).
 * Lưu HTML — backend lọc lại thẻ an toàn (chống XSS) trước khi lưu.
 * Ảnh chèn vào nội dung hiện ngay nhưng CHỈ được lưu lên kho ảnh (Cloudinary, folder tuỳ chọn) khi bấm Lưu
 * (./pendingImages.js). Cỡ ảnh, căn giữa, nút X xoá ảnh, nguồn ảnh: ./richTextImage.js. Bảng: ./richTextTable.js.
 * Danh sách extension: ./richTextSchema.js. lang (en / vi / zh): chữ đầu dòng nguồn ảnh ("Photo" / "Ảnh" / "图片").
 *   <RichText value={html} onChange={setHtml} folder="articles" minHeight={320} lang="vi" />
 */
export default function RichText({
  value,
  onChange,
  folder = "content",
  placeholder = "Nhập nội dung…",
  minHeight = 220,
  lang,
}) {
  const { toast } = useUi();
  const [imgOpen, setImgOpen] = useState(false);
  const [linkState, setLinkState] = useState(null); // { href, blank } khi đang mở hộp chèn link
  const [source, setSource] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creditState, setCreditState] = useState(null); // { pos, isNew, fields } khi đang sửa nguồn ảnh
  // chữ đầu dòng nguồn ảnh khi ảnh chưa có ("Photo" / "Ảnh" / "图片" theo ngôn ngữ đang soạn)
  const creditPrefix = CREDIT_PREFIX[lang] ?? "Photo";
  // ảnh trong bài không có khung cố định: chỉ mời cắt ảnh quá dọc / quá dài, ảnh quá lớn tự thu nhỏ
  const cropper = useImageCrop(CROP_PRESETS.content, folder);
  const lastEmitted = useRef(value ?? "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions({
      placeholder,
      onEditCredit: ({ pos, credit }) =>
        setCreditState({
          pos,
          isNew: !credit?.length,
          fields: parseCredit(credit, ""), // prefix "" → dùng creditPrefix lúc lưu
        }),
    }),
    content: value || "",
    editorProps: {
      attributes: {
        class: "admin-prose prose-sm max-w-none px-4 py-3 outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.isEmpty ? "" : tidyEditorHtml(e.getHTML());
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Nội dung đổi từ bên ngoài (đổi tab ngôn ngữ, tải dữ liệu) → nạp lại vào trình soạn
  useEffect(() => {
    if (!editor || (value ?? "") === lastEmitted.current) return;
    lastEmitted.current = value ?? "";
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  const insertImage = async (files) => {
    const list = [...(files ?? [])];
    if (!list.length || !editor) return;
    setImgOpen(false); // nhường chỗ cho hộp cắt ảnh (nếu cần)
    setBusy(true);
    try {
      const urls = await cropper.uploadFiles(list, { max: 10 });
      insertImages(editor, urls);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  /** Ảnh từ link: máy chủ nhờ Cloudinary chép ảnh về (không nhúng thẳng ảnh của trang khác) */
  const insertImageLinks = async (links) => {
    if (!editor) return false;
    setBusy(true);
    try {
      const { urls, failed } = await cropper.importLinks(links.slice(0, 10), {
        beforeCrop: () => setImgOpen(false),
      });
      if (urls.length) insertImages(editor, urls);
      if (failed)
        toast(
          `${failed} link không lấy được ảnh (link hỏng hoặc không phải ảnh công khai)`,
          "error",
        );
      if (!failed) setImgOpen(false);
      return !failed;
    } catch (err) {
      toast(errorMessage(err), "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openLink = () => {
    const attrs = editor.getAttributes("link");
    setLinkState({ href: attrs.href ?? "", blank: attrs.target === "_blank" || !attrs.href });
  };
  const LINK_RX = /^(https?:\/\/\S+|\/[^\s]*|mailto:\S+|tel:[+\d\s().-]+)$/i;
  const applyLink = () => {
    const href = linkState.href.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return setLinkState(null);
    }
    if (!LINK_RX.test(href))
      return toast("Liên kết cần bắt đầu bằng https:// (hoặc / , mailto: , tel:)", "error");
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink(
        linkState.blank && /^https?:/i.test(href)
          ? { href, target: "_blank", rel: EXTERNAL_REL }
          : { href, target: null, rel: null },
      )
      .run();
    setLinkState(null);
  };

  // Trạng thái thanh công cụ, cập nhật mỗi khi con trỏ di chuyển (nút đang bật, đang ở trong bảng…).
  // inTable → hiện dải nút sửa bảng; headerRow: hàng đầu của bảng đang là hàng tiêu đề.
  const ui =
    useEditorState({
      editor,
      selector: ({ editor: e }) => {
        if (!e) return { inTable: false, headerRow: false, marks: "" };
        const { $from } = e.state.selection;
        let table = null;
        for (let d = $from.depth; d > 0 && !table; d--)
          if ($from.node(d).type.name === "table") table = $from.node(d);
        const marks = [
          ...["bold", "italic", "underline", "link"],
          ...["bulletList", "orderedList", "blockquote"],
        ]
          .map((n) => +e.isActive(n))
          .concat([2, 3].map((level) => +e.isActive("heading", { level })))
          .concat(["left", "center", "right"].map((a) => +e.isActive({ textAlign: a })))
          .join("");
        return {
          inTable: !!table,
          headerRow: table?.firstChild?.firstChild?.type.name === "tableHeader",
          marks, // chỉ để vẽ lại thanh công cụ khi nút đang bật thay đổi
        };
      },
    }) ?? {};
  /** Lưu nguồn ảnh vào ảnh đang sửa (Hoàn tác được) */
  const saveCredit = (remove) => {
    const { pos, fields } = creditState;
    const node = editor?.state.doc.nodeAt(pos);
    if (node?.type.name !== "image") return setCreditState(null);
    const credit = remove
      ? null
      : buildCredit({ ...fields, prefix: fields.prefix || creditPrefix });
    if (!remove && !credit)
      return toast("Nhập tên tác giả hoặc nơi lấy ảnh (vd Wikimedia Commons)", "error");
    for (const k of ["authorUrl", "licenseUrl"])
      if (!remove && fields[k].trim() && !/^https?:\/\/\S+$/i.test(fields[k].trim()))
        return toast("Link cần bắt đầu bằng https://", "error");
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, credit }));
    setCreditState(null);
  };
  const setCredit = (patch) => setCreditState((x) => ({ ...x, fields: { ...x.fields, ...patch } }));

  const off = !editor || source;
  const tbl = (fn) => () => fn(editor.chain().focus()).run();
  const is = (n, a) => editor?.isActive(n, a);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
      <div className="flex flex-wrap items-center gap-y-1 border-b border-slate-100 bg-slate-50/70 px-2 py-1.5">
        <G>
          <B
            off={off}
            title="Đậm"
            icon={Bold}
            on={is("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <B
            off={off}
            title="Nghiêng"
            icon={Italic}
            on={is("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <B
            off={off}
            title="Gạch chân"
            icon={Underline}
            on={is("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
        </G>
        <G>
          <B
            off={off}
            title="Tiêu đề lớn — hiện trong mục lục bài viết"
            icon={Heading2}
            on={is("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <B
            off={off}
            title="Tiêu đề nhỏ"
            icon={Heading3}
            on={is("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <B
            off={off}
            title="Danh sách"
            icon={List}
            on={is("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <B
            off={off}
            title="Danh sách số"
            icon={ListOrdered}
            on={is("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <B
            off={off}
            title="Trích dẫn"
            icon={Quote}
            on={is("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
          <B
            off={off}
            title="Đường kẻ"
            icon={Minus}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          />
        </G>
        <G>
          <B
            off={off}
            title="Căn trái"
            icon={AlignLeft}
            on={is({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          />
          <B
            off={off}
            title="Căn giữa"
            icon={AlignCenter}
            on={is({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          />
          <B
            off={off}
            title="Căn phải"
            icon={AlignRight}
            on={is({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          />
        </G>
        <G>
          <B off={off} title="Chèn / sửa link" icon={Link2} on={is("link")} onClick={openLink} />
          <B
            off={off}
            title="Bỏ link"
            icon={Unlink}
            disabled={!is("link")}
            onClick={() => editor.chain().focus().unsetLink().run()}
          />
          <B
            off={off}
            title="Chèn ảnh"
            icon={busy ? Loader2 : ImagePlus}
            disabled={busy}
            onClick={() => setImgOpen(true)}
          />
          <B
            off={off}
            title={
              ui.inTable
                ? "Đang sửa bảng (các nút ở dải bên dưới)"
                : "Chèn bảng (3 cột, có hàng tiêu đề)"
            }
            icon={Table2}
            on={ui.inTable}
            disabled={ui.inTable}
            onClick={tbl((c) => c.insertTable(NEW_TABLE))}
          />
        </G>
        <G>
          <B
            off={off}
            title="Hoàn tác"
            icon={Undo2}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <B
            off={off}
            title="Làm lại"
            icon={Redo2}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </G>
        <button
          type="button"
          onClick={() => setSource((s) => !s)}
          title="Xem và sửa nội dung ở dạng mã (dành cho người đã quen)"
          className={cn(
            "ml-auto flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100",
            source && "bg-brand-50 text-brand-700",
          )}
        >
          <Code2 className="size-4" /> Nâng cao
        </button>
      </div>
      {ui.inTable && !source && (
        <div className="flex flex-wrap items-center gap-y-1 border-b border-slate-100 bg-brand-50/50 px-2 py-1">
          <span className="mr-1 flex items-center gap-1.5 px-1 text-xs font-semibold text-brand-700">
            <Table2 className="size-3.5" /> Bảng:
          </span>
          <G>
            <TB
              on={ui.headerRow}
              title="Bật / tắt hàng tiêu đề (hàng đầu tô nền, chữ đậm)"
              onClick={tbl((c) => c.toggleHeaderRow())}
            >
              Hàng tiêu đề
            </TB>
          </G>
          <G>
            <TB
              title="Thêm một hàng ngay dưới hàng đang chọn"
              onClick={tbl((c) => c.addRowAfter())}
            >
              + Thêm hàng
            </TB>
            <TB title="Xoá hàng đang chọn" onClick={tbl((c) => c.deleteRow())}>
              Xoá hàng
            </TB>
          </G>
          <G>
            <TB
              title="Thêm một cột ngay bên phải cột đang chọn"
              onClick={tbl((c) => c.addColumnAfter())}
            >
              + Thêm cột
            </TB>
            <TB title="Xoá cột đang chọn" onClick={tbl((c) => c.deleteColumn())}>
              Xoá cột
            </TB>
          </G>
          <TB danger title="Xoá cả bảng" onClick={tbl((c) => c.deleteTable())}>
            Xoá bảng
          </TB>
        </div>
      )}
      {source ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => {
            lastEmitted.current = "\u0000"; // buộc nạp lại khi tắt chế độ HTML
            onChange(e.target.value);
          }}
          spellCheck={false}
          className="block w-full resize-y bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-emerald-200 outline-none"
          style={{ minHeight }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      {cropper.dialog}

      <ImageUrlDialog
        open={imgOpen}
        onClose={() => setImgOpen(false)}
        title="Chèn ảnh vào nội dung"
        multiple
        busy={busy}
        onFiles={insertImage}
        onSubmit={insertImageLinks}
      />

      <Modal
        open={!!linkState}
        onClose={() => setLinkState(null)}
        size="sm"
        icon={Link2}
        title="Chèn liên kết"
        description="Bôi đen chữ trước khi bấm nút liên kết. Để trống rồi bấm Lưu để bỏ liên kết."
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkState(null)}>
              Huỷ
            </Button>
            <Button onClick={applyLink}>Lưu liên kết</Button>
          </>
        }
      >
        {linkState && (
          <div className="space-y-4">
            <Field
              label="Địa chỉ liên kết"
              hint="Vd: https://… (website khác) hoặc /tours/…, /vi/…, /zh/… (trang trong website)"
            >
              <Input
                value={linkState.href}
                onChange={(e) => setLinkState((x) => ({ ...x, href: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyLink())}
                placeholder="https://"
                inputMode="url"
              />
            </Field>
            <Toggle
              checked={linkState.blank}
              onChange={(blank) => setLinkState((x) => ({ ...x, blank }))}
              label="Mở trong tab mới"
              hint="Nên bật với link sang website khác. Link trong website không cần."
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!creditState}
        onClose={() => setCreditState(null)}
        size="sm"
        icon={ImagePlus}
        title={creditState?.isNew ? "Thêm nguồn ảnh" : "Sửa nguồn ảnh"}
        description="Ảnh lấy từ Wikimedia Commons, Pexels… cần ghi tên tác giả (và giấy phép). Dòng này hiện nhỏ dưới chú thích ảnh."
        footer={
          <>
            {!creditState?.isNew && (
              <Button variant="secondary" className="mr-auto" onClick={() => saveCredit(true)}>
                Xoá nguồn ảnh
              </Button>
            )}
            <Button variant="secondary" onClick={() => setCreditState(null)}>
              Huỷ
            </Button>
            <Button onClick={() => saveCredit(false)}>Lưu nguồn ảnh</Button>
          </>
        }
      >
        {creditState && (
          <CreditForm
            fields={{ ...creditState.fields, prefix: creditState.fields.prefix || creditPrefix }}
            set={setCredit}
          />
        )}
      </Modal>
    </div>
  );
}

const SOURCES = ["Wikimedia Commons", "Pexels", "Unsplash", "Pixabay", "Flickr"];
const LICENSES = [
  "CC BY 2.0",
  "CC BY 3.0",
  "CC BY 4.0",
  "CC BY-SA 2.0",
  "CC BY-SA 3.0",
  "CC BY-SA 4.0",
  "CC0",
  "Public domain",
];

/** Các ô của hộp nguồn ảnh + dòng xem trước */
function CreditForm({ fields: f, set }) {
  const preview = buildCredit(f);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tác giả" required>
          <Input
            value={f.author}
            onChange={(e) => set({ author: e.target.value })}
            placeholder="Tên tác giả ảnh"
            maxLength={120}
          />
        </Field>
        <Field label="Nơi lấy ảnh">
          <Input
            value={f.source}
            onChange={(e) => set({ source: e.target.value })}
            list="rt-credit-sources"
            placeholder="Wikimedia Commons"
            maxLength={60}
          />
        </Field>
      </div>
      <Field label="Link trang ảnh gốc" hint="Bấm vào tên tác giả sẽ mở trang này (tab mới).">
        <Input
          value={f.authorUrl}
          onChange={(e) => set({ authorUrl: e.target.value })}
          placeholder="https://commons.wikimedia.org/wiki/File:…"
          inputMode="url"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Giấy phép" hint="Ảnh Pexels / Unsplash: để trống.">
          <Input
            value={f.license}
            onChange={(e) => {
              const license = e.target.value;
              // giấy phép CC → tự điền link giấy phép (nếu chưa nhập hoặc đang là link tự điền)
              const auto = licenseUrlFor(license);
              const wasAuto = !f.licenseUrl || f.licenseUrl === licenseUrlFor(f.license);
              set({ license, ...(wasAuto && { licenseUrl: auto }) });
            }}
            list="rt-credit-licenses"
            placeholder="CC BY-SA 4.0"
            maxLength={60}
          />
        </Field>
        <Field label="Link giấy phép" hint="Tự điền với giấy phép CC.">
          <Input
            value={f.licenseUrl}
            onChange={(e) => set({ licenseUrl: e.target.value })}
            placeholder="https://creativecommons.org/…"
            inputMode="url"
          />
        </Field>
      </div>
      <datalist id="rt-credit-sources">
        {SOURCES.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
      <datalist id="rt-credit-licenses">
        {LICENSES.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
      <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500">
        <span className="mb-1 block text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Xem trước
        </span>
        {preview
          ? preview.map((p, i) =>
              p.href ? (
                <span key={i} className="underline decoration-slate-300 underline-offset-2">
                  {p.text}
                </span>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )
          : "—"}
      </div>
    </div>
  );
}
