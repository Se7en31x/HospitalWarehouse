import { api } from "@/lib/apiClient";

export interface ReturnAttachment {
  url: string;
  public_id: string;
  resource_type?: string;
  format?: string | null;
  bytes?: number | null;
  filename?: string | null;
  uploaded_by?: string | null;
  uploaded_at?: string | null;
}

export interface AttachmentUploadResult {
  attachments: ReturnAttachment[];
  added: ReturnAttachment[];
}

export interface AttachmentDeleteResult {
  attachments: ReturnAttachment[];
  removed: ReturnAttachment;
}

const buildFormData = (files: File[]): FormData => {
  const fd = new FormData();
  for (const f of files) {
    fd.append("files", f);
  }
  return fd;
};

const uploadAttachments = async (
  url: string,
  files: File[]
): Promise<AttachmentUploadResult> => {
  const fd = buildFormData(files);
  return api.upload<AttachmentUploadResult>(url, fd, "PATCH");
};

const deleteAttachment = async (
  url: string,
  publicId: string
): Promise<AttachmentDeleteResult> => {
  return api.delete<AttachmentDeleteResult>(
    `${url}?public_id=${encodeURIComponent(publicId)}`
  );
};

// ── BORROW return flow ──────────────────────────────────────────────────────
/** ผู้ยืม (requester) แนบเอกสารตอนส่งคืน */
export const uploadBorrowReturnSubmitAttachments = (
  requisitionId: number | string,
  files: File[]
) =>
  uploadAttachments(
    `/v1/files/returns/borrow/${requisitionId}/submit-attachments`,
    files
  );

export const deleteBorrowReturnSubmitAttachment = (
  requisitionId: number | string,
  publicId: string
) =>
  deleteAttachment(
    `/v1/files/returns/borrow/${requisitionId}/submit-attachments`,
    publicId
  );

/** เจ้าหน้าที่คลังถ่ายตอนตรวจรับคืน */
export const uploadBorrowReturnVerifyAttachments = (
  requisitionId: number | string,
  files: File[]
) =>
  uploadAttachments(
    `/v1/files/returns/borrow/${requisitionId}/verify-attachments`,
    files
  );

export const deleteBorrowReturnVerifyAttachment = (
  requisitionId: number | string,
  publicId: string
) =>
  deleteAttachment(
    `/v1/files/returns/borrow/${requisitionId}/verify-attachments`,
    publicId
  );

// ── DEPARTMENT return flow ──────────────────────────────────────────────────
/** แผนกแนบเอกสารตอนสร้างคำขอคืน */
export const uploadDepartmentReturnSubmitAttachments = (
  returnRequestId: number | string,
  files: File[]
) =>
  uploadAttachments(
    `/v1/files/returns/department/${returnRequestId}/submit-attachments`,
    files
  );

export const deleteDepartmentReturnSubmitAttachment = (
  returnRequestId: number | string,
  publicId: string
) =>
  deleteAttachment(
    `/v1/files/returns/department/${returnRequestId}/submit-attachments`,
    publicId
  );

/** เจ้าหน้าที่คลังถ่ายตอนรับคืนของจากแผนก */
export const uploadDepartmentReturnProcessAttachments = (
  returnRequestId: number | string,
  files: File[]
) =>
  uploadAttachments(
    `/v1/files/returns/department/${returnRequestId}/process-attachments`,
    files
  );

export const deleteDepartmentReturnProcessAttachment = (
  returnRequestId: number | string,
  publicId: string
) =>
  deleteAttachment(
    `/v1/files/returns/department/${returnRequestId}/process-attachments`,
    publicId
  );

// ── Validation helpers ─────────────────────────────────────────────────────
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

export const MAX_ATTACHMENT_SIZE_MB = 10;
export const MAX_ATTACHMENTS_PER_UPLOAD = 5;

export interface AttachmentValidationResult {
  valid: File[];
  rejected: { file: File; reason: string }[];
}

export const validateAttachmentFiles = (
  files: File[] | FileList | null | undefined
): AttachmentValidationResult => {
  const list = files ? Array.from(files) : [];
  const valid: File[] = [];
  const rejected: { file: File; reason: string }[] = [];

  for (const file of list) {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      rejected.push({
        file,
        reason: "ไฟล์ไม่รองรับ (รับเฉพาะ JPEG, PNG, WEBP, HEIC, PDF)",
      });
      continue;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_MB * 1024 * 1024) {
      rejected.push({
        file,
        reason: `ไฟล์ใหญ่เกิน ${MAX_ATTACHMENT_SIZE_MB} MB`,
      });
      continue;
    }
    valid.push(file);
  }

  return { valid, rejected };
};
