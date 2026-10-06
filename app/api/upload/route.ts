import { NextResponse } from "next/server";
import { uploadImage } from "@/features/media/upload.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * POST /api/upload (multipart: file, type, entityId?, entityName?)
 * Upload an image to ImageKit; the data layer checks who may upload where.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    return NextResponse.json(
      await uploadImage({
        file: file instanceof File ? file : null,
        type: form.get("type") as string | null,
        entityId: form.get("entityId") as string | null,
        entityName: form.get("entityName") as string | null,
      })
    );
  } catch (error) {
    return apiErrorFrom(error, "Upload failed");
  }
}
