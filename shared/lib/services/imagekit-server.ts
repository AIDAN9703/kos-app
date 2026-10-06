import ImageKit from "imagekit";

/**
 * Server-only ImageKit client (uploads, file management).
 *
 * Never import this from client components — the private key must stay on the
 * server. Client-safe URL helpers live in `shared/lib/utils/imagekit.ts`.
 */
let client: ImageKit | null = null;

function resolveImageKitConfig() {
  const publicKey =
    process.env.IMAGEKIT_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
    "";
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
  const urlEndpoint =
    process.env.IMAGEKIT_URL_ENDPOINT ||
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
    "";

  if (!privateKey) {
    const hints: string[] = [];
    if (process.env.NEXT_PUBLIC_IMAGEKIT_PRIVATE_KEY) {
      hints.push(
        "NEXT_PUBLIC_IMAGEKIT_PRIVATE_KEY is set but ignored — use IMAGEKIT_PRIVATE_KEY (server-only, no NEXT_PUBLIC prefix)."
      );
    } else {
      hints.push("Set IMAGEKIT_PRIVATE_KEY in Vercel → Project → Settings → Environment Variables (Production).");
    }
    throw new Error(`Missing ImageKit private key. ${hints.join(" ")}`);
  }

  if (!publicKey || !urlEndpoint) {
    throw new Error(
      "Missing ImageKit publicKey or urlEndpoint. Set IMAGEKIT_PUBLIC_KEY and IMAGEKIT_URL_ENDPOINT (or the NEXT_PUBLIC_* variants for public key / endpoint)."
    );
  }

  return { publicKey, privateKey, urlEndpoint };
}

export function getImageKit(): ImageKit {
  if (!client) {
    client = new ImageKit(resolveImageKitConfig());
  }
  return client;
}
