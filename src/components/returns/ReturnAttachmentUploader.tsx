"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Paperclip, FileText, X, UploadCloud, Loader2, ImageIcon } from "lucide-react";
import Swal from "sweetalert2";
import {
  ReturnAttachment,
  validateAttachmentFiles,
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE_MB,
  MAX_ATTACHMENTS_PER_UPLOAD,
} from "@/services/returnAttachmentService";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface ReturnAttachmentUploaderProps {
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  uploadedAttachments?: ReturnAttachment[];
  onRemoveUploaded?: (publicId: string) => Promise<void> | void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  maxTotal?: number;
  className?: string;
}

const isImageFile = (file: File) => file.type.startsWith("image/");
const isImageAttachment = (att: ReturnAttachment) =>
  (att.resource_type || "").toLowerCase() === "image" ||
  (att.format || "").toLowerCase().match(/^(jpe?g|png|webp|heic|heif|gif)$/i) !== null;

const formatBytes = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const filenameFromAttachment = (att: ReturnAttachment): string => {
  if (att.filename) return att.filename;
  const last = (att.public_id || "").split("/").pop() || "ไฟล์แนบ";
  return last;
};

// ── Compact preview tile (รูปเล็ก + ชื่อ + ปุ่มลบ) ─────────────────────────
function PreviewTile({
  thumbUrl,
  isImage,
  filename,
  sizeLabel,
  badgeText,
  badgeTone = "blue",
  onRemove,
  removing = false,
  onOpen,
}: {
  thumbUrl?: string;
  isImage: boolean;
  filename: string;
  sizeLabel?: string;
  badgeText?: string;
  badgeTone?: "emerald" | "blue";
  onRemove?: () => void;
  removing?: boolean;
  onOpen?: () => void;
}) {
  const badgeClass =
    badgeTone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="group relative flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-colors hover:border-slate-300">
      {/* Thumb */}
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-50 border border-slate-100 disabled:cursor-default"
        aria-label={onOpen ? `เปิดไฟล์ ${filename}` : undefined}
      >
        {isImage && thumbUrl ? (
          <Image
            src={thumbUrl}
            alt={filename}
            fill
            sizes="40px"
            className="object-cover"
            unoptimized
          />
        ) : isImage ? (
          <ImageIcon className="h-4 w-4 text-slate-400" />
        ) : (
          <FileText className="h-4 w-4 text-rose-500" />
        )}
        {badgeText && (
          <span className="absolute -bottom-0 -right-0 rounded-bl-md rounded-tr-none rounded-br-md border-[10px] border-transparent border-b-rose-500 border-r-rose-500" />
        )}
      </button>

      {/* Filename + meta */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[12px] font-medium text-slate-800 leading-tight"
          title={filename}
        >
          {filename}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {badgeText && (
            <span className={`text-[10px] px-1 py-0 rounded border ${badgeClass}`}>
              {badgeText}
            </span>
          )}
          {sizeLabel && (
            <span className="text-[10px] text-slate-400">{sizeLabel}</span>
          )}
        </div>
      </div>

      {/* Remove */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove();
          }}
          disabled={removing}
          className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          title="ลบไฟล์"
        >
          {removing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

export default function ReturnAttachmentUploader({
  pendingFiles,
  onPendingFilesChange,
  uploadedAttachments = [],
  onRemoveUploaded,
  disabled = false,
  label = "เอกสาร / รูปภาพแนบ",
  helperText = "รองรับ JPEG, PNG, WEBP, HEIC, PDF (≤ 10 MB ต่อไฟล์)",
  maxTotal = 10,
  className = "",
}: ReturnAttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);

  const previews: PendingFile[] = pendingFiles.map((f, idx) => ({
    id: `${f.name}-${f.size}-${idx}`,
    file: f,
    previewUrl: isImageFile(f) ? URL.createObjectURL(f) : "",
  }));

  const totalCount = uploadedAttachments.length + pendingFiles.length;
  const remainingSlots = Math.max(0, maxTotal - totalCount);

  const triggerPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    if (incoming.length > MAX_ATTACHMENTS_PER_UPLOAD) {
      Swal.fire({
        icon: "warning",
        title: `เลือกไฟล์ได้สูงสุด ${MAX_ATTACHMENTS_PER_UPLOAD} ไฟล์ต่อครั้ง`,
        confirmButtonText: "ตกลง",
      });
      return;
    }

    if (incoming.length > remainingSlots) {
      Swal.fire({
        icon: "warning",
        title: `แนบไฟล์ได้รวมไม่เกิน ${maxTotal} ไฟล์`,
        text: `เหลือพื้นที่อีก ${remainingSlots} ไฟล์`,
        confirmButtonText: "ตกลง",
      });
      return;
    }

    const { valid, rejected } = validateAttachmentFiles(incoming);
    if (rejected.length > 0) {
      const lines = rejected
        .map((r) => `• ${r.file.name} — ${r.reason}`)
        .join("\n");
      Swal.fire({
        icon: "warning",
        title: "บางไฟล์ถูกข้าม",
        text: lines,
        confirmButtonText: "ตกลง",
      });
    }
    if (valid.length > 0) {
      onPendingFilesChange([...pendingFiles, ...valid]);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePending = (idx: number) => {
    const next = pendingFiles.filter((_, i) => i !== idx);
    onPendingFilesChange(next);
  };

  const removeUploaded = async (att: ReturnAttachment) => {
    if (!onRemoveUploaded || disabled) return;
    const ok = await Swal.fire({
      icon: "warning",
      title: "ลบไฟล์แนบ?",
      text: filenameFromAttachment(att),
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    try {
      setRemovingId(att.public_id);
      await onRemoveUploaded(att.public_id);
    } finally {
      setRemovingId(null);
    }
  };

  const showDropzone = !disabled && remainingSlots > 0;
  const hasFiles = uploadedAttachments.length > 0 || previews.length > 0;

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Paperclip className="h-3.5 w-3.5" />
          {label}
        </label>
        {totalCount > 0 && (
          <span className="text-[11px] text-slate-500 tabular-nums">
            {totalCount}/{maxTotal} ไฟล์
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_ATTACHMENT_TYPES.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Side-by-side layout: dropzone (left) + preview grid (right) */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Dropzone — left column */}
        {showDropzone && (
          <button
            type="button"
            onClick={triggerPicker}
            className={`group shrink-0 w-full sm:w-56 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 bg-white px-4 py-5 text-sm text-slate-600 hover:text-blue-700 transition-colors ${
              hasFiles ? "sm:min-h-[8rem]" : "sm:min-h-[7rem]"
            }`}
          >
            <UploadCloud className="h-7 w-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <span className="font-semibold leading-tight">คลิกเพื่อเลือกไฟล์</span>
            <span className="text-[11px] text-slate-400 text-center leading-snug">
              {helperText}
            </span>
          </button>
        )}

        {/* Preview area — right column (fills remaining space) */}
        <div className="flex-1 min-w-0">
          {hasFiles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {uploadedAttachments.map((att) => {
                const filename = filenameFromAttachment(att);
                const isImg = isImageAttachment(att);
                return (
                  <PreviewTile
                    key={att.public_id}
                    thumbUrl={att.url}
                    isImage={isImg}
                    filename={filename}
                    sizeLabel={formatBytes(att.bytes)}
                    badgeText="บันทึกแล้ว"
                    badgeTone="emerald"
                    onRemove={onRemoveUploaded && !disabled ? () => removeUploaded(att) : undefined}
                    removing={removingId === att.public_id}
                    onOpen={() =>
                      isImg
                        ? setLightbox({ url: att.url, name: filename })
                        : window.open(att.url, "_blank", "noopener,noreferrer")
                    }
                  />
                );
              })}

              {previews.map((pf, idx) => (
                <PreviewTile
                  key={pf.id}
                  thumbUrl={pf.previewUrl}
                  isImage={!!pf.previewUrl}
                  filename={pf.file.name}
                  sizeLabel={formatBytes(pf.file.size)}
                  badgeText="ใหม่"
                  badgeTone="blue"
                  onRemove={!disabled ? () => removePending(idx) : undefined}
                  onOpen={
                    pf.previewUrl
                      ? () => setLightbox({ url: pf.previewUrl, name: pf.file.name })
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="hidden sm:flex h-full min-h-[7rem] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/30 px-4 py-5 text-xs text-slate-400 italic">
              ยังไม่มีไฟล์ที่เลือก
            </div>
          )}
        </div>
      </div>

      {disabled && totalCount === 0 && (
        <p className="text-xs text-slate-400 italic">— ไม่มีไฟล์แนบ —</p>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <div
            className="relative flex flex-col rounded-2xl bg-white p-3 shadow-2xl max-w-[92vw] max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-800"
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-center min-h-0 min-w-0">
              <img
                src={lightbox.url}
                alt={lightbox.name}
                className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
              />
            </div>
            <p
              className="mt-2 truncate text-center text-xs font-medium text-slate-600 px-2"
              title={lightbox.name}
            >
              {lightbox.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Read-only viewer สำหรับหน้ารายละเอียด — compact list view */
export function ReturnAttachmentViewer({
  attachments,
  label = "เอกสาร / รูปแนบ",
  emptyText = "— ไม่มีไฟล์แนบ —",
}: {
  attachments: ReturnAttachment[];
  label?: string;
  emptyText?: string;
}) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);

  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-sm">
        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-slate-400 italic text-xs">{emptyText}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5" />
        {label}
        <span className="text-[11px] text-slate-500 font-normal">({attachments.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {attachments.map((att) => {
          const filename = filenameFromAttachment(att);
          const isImg = isImageAttachment(att);
          return (
            <PreviewTile
              key={att.public_id}
              thumbUrl={att.url}
              isImage={isImg}
              filename={filename}
              sizeLabel={formatBytes(att.bytes)}
              onOpen={() =>
                isImg
                  ? setLightbox({ url: att.url, name: filename })
                  : window.open(att.url, "_blank", "noopener,noreferrer")
              }
            />
          );
        })}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <div
            className="relative flex flex-col rounded-2xl bg-white p-3 shadow-2xl max-w-[92vw] max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-800"
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-center min-h-0 min-w-0">
              <img
                src={lightbox.url}
                alt={lightbox.name}
                className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
              />
            </div>
            <p
              className="mt-2 truncate text-center text-xs font-medium text-slate-600 px-2"
              title={lightbox.name}
            >
              {lightbox.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
