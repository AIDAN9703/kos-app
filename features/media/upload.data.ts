import "server-only";

import { getImageKit } from "@/shared/lib/services/imagekit-server";
import { UserFacingError } from "@/shared/lib/errors";
import { assertCan, assertSignedIn } from "@/shared/lib/utils/auth-utils";

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadImage(input: {
  file: File | null;
  type: string | null;
  entityId?: string | null;
  entityName?: string | null;
}) {
  const me = await assertSignedIn("Unauthorized");
  const { file, type, entityId, entityName } = input;
  if (!file) throw new UserFacingError("No file provided");
  if (!file.type.startsWith("image/")) throw new UserFacingError("Only image files are allowed");
  if (file.size > MAX_BYTES) throw new UserFacingError("File size should be less than 10MB");

  let folder: string;
  const tags: string[] = [String(type)];
  switch (type) {
    case "profile":
      folder = `/users/${me.id}/profile`;
      tags.push(`user_${me.id}`);
      break;
    case "misc":
      folder = `/misc/${me.id}`;
      tags.push(`user_${me.id}`);
      break;
    case "boat": {
      await assertCan({ boat: ["edit"] });
      if (!entityId || !entityName) {
        throw new UserFacingError("Boat ID and name are required for boat images");
      }
      // A URL-friendly version of the boat name
      const safeBoatName = entityName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      folder = `/boats/${entityId}-${safeBoatName}`;
      tags.push(`boat_${entityId}`);
      break;
    }
    case "blog": {
      await assertCan({ blog: ["edit"] });
      const now = new Date();
      folder = `/blog/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
      tags.push("blog_content", `user_${me.id}`);
      break;
    }
    default:
      throw new UserFacingError("Invalid upload type");
  }

  // Auto format/quality happen on the CDN side.
  const result = await getImageKit().upload({
    file: Buffer.from(await file.arrayBuffer()),
    fileName: `${type}_${Date.now()}.${file.name.split(".").pop()}`,
    folder,
    useUniqueFileName: true,
    tags,
    responseFields: ["tags", "metadata"],
  });
  return {
    url: result.url,
    fileId: result.fileId,
    thumbnailUrl: result.thumbnailUrl,
    tags: result.tags,
    metadata: result.metadata,
  };
}
