"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
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
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CROP_PRESETS, useImageCrop } from "./ImageCropper";
import ContentImage, { insertImages } from "./richTextImage";
import { Button, Field, Input, Modal, Toggle, useUi } from "./ui";

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

/**
 * Trình soạn thảo nội dung (bài viết, lịch trình từng ngày, trang chính sách…).
 * Lưu HTML — backend lọc lại thẻ an toàn (chống XSS) trước khi lưu.
 * Ảnh chèn vào nội dung hiện ngay nhưng CHỈ được lưu lên kho ảnh (Cloudinary, folder tuỳ chọn) khi bấm Lưu
 * (./pendingImages.js). Cỡ ảnh, căn giữa, nút X xoá ảnh: ./richTextImage.js
 *   <RichText value={html} onChange={setHtml} folder="articles" minHeight={320} />
 */
export default function RichText({
  value,
  onChange,
  folder = "content",
  placeholder = "Nhập nội dung…",
  minHeight = 220,
}) {
  const { toast } = useUi();
  const fileRef = useRef(null);
  const [imgOpen, setImgOpen] = useState(false);
  const [linkState, setLinkState] = useState(null); // { href, blank } khi đang mở hộp chèn link
  const [imgUrl, setImgUrl] = useState("");
  const [source, setSource] = useState(false);
  const [busy, setBusy] = useState(false);
  // ảnh trong bài không có khung cố định: chỉ mời cắt ảnh quá dọc / quá dài, ảnh quá lớn tự thu nhỏ
  const cropper = useImageCrop(CROP_PRESETS.content, folder);
  const lastEmitted = useRef(value ?? "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true },
      }),
      ContentImage.configure({ HTMLAttributes: { loading: "lazy" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "admin-prose prose-sm max-w-none px-4 py-3 outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.isEmpty ? "" : e.getHTML();
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
    if (fileRef.current) fileRef.current.value = "";
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
  const insertImageUrl = async () => {
    const url = imgUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url))
      return toast("Link ảnh phải bắt đầu bằng http:// hoặc https://", "error");
    setBusy(true);
    try {
      const { urls } = await cropper.importLinks([url], { beforeCrop: () => setImgOpen(false) });
      if (urls[0]) insertImages(editor, [urls[0]]);
      setImgUrl("");
      setImgOpen(false);
    } catch (err) {
      toast(errorMessage(err), "error");
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
      .setLink({ href, target: linkState.blank && /^https?:/i.test(href) ? "_blank" : null })
      .run();
    setLinkState(null);
  };

  const off = !editor || source;
  const is = (n, a) => editor?.isActive(n, a);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/70 px-2 py-1.5">
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
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <B
          off={off}
          title="Tiêu đề lớn"
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
        <span className="mx-1 h-5 w-px bg-slate-200" />
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
        <span className="mx-1 h-5 w-px bg-slate-200" />
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
        <span className="mx-1 h-5 w-px bg-slate-200" />
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
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        hidden
        onChange={(e) => insertImage(e.target.files)}
      />
      {cropper.dialog}

      <Modal
        open={imgOpen}
        onClose={() => setImgOpen(false)}
        size="sm"
        icon={ImagePlus}
        title="Chèn ảnh vào nội dung"
        description="Tải ảnh từ máy hoặc dán link. Ảnh hiện ngay trong bài, tự căn giữa và vừa khung — chỉ được lưu lên website khi bạn bấm Lưu."
      >
        <div className="space-y-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/50 disabled:opacity-60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200">
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">Tải ảnh từ máy</span>
              <span className="block text-xs text-slate-500">
                JPG, PNG, WebP, AVIF, GIF · tối đa 8MB / ảnh · chọn nhiều ảnh được
              </span>
            </span>
          </button>
          <div className="flex items-center gap-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            <span className="h-px flex-1 bg-slate-200" /> hoặc{" "}
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <Field label="Dán link ảnh" hint="Link trực tiếp tới file ảnh, mở được công khai.">
            <div className="flex gap-2">
              <Input
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), insertImageUrl())}
                placeholder="https://…/anh.jpg"
                inputMode="url"
              />
              <Button onClick={insertImageUrl} loading={busy} disabled={!imgUrl.trim()}>
                Chèn
              </Button>
            </div>
          </Field>
        </div>
      </Modal>

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
              hint="Vd: https://… hoặc /tours/… (trang trong website)"
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
              hint="Nên bật với link sang website khác"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
