import {
  DocumentUploadValidationError,
  uploadDocument,
  type UploadDocumentInput,
} from '@/server/actions/documents';

export type ControlledDocumentUploadResult =
  | { ok: true }
  | { ok: false; code: 'invalid_upload' };

export async function uploadDocumentWithControlledValidation(
  input: UploadDocumentInput,
  file: File,
): Promise<ControlledDocumentUploadResult> {
  try {
    await uploadDocument(input, file);
    return { ok: true };
  } catch (error) {
    if (error instanceof DocumentUploadValidationError) {
      return { ok: false, code: 'invalid_upload' };
    }

    throw error;
  }
}
