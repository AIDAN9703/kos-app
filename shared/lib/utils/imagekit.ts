// Client-safe ImageKit URL/props helpers. This module is imported by client
// components, so it must never touch the private key or the server SDK —
// the upload client lives in `shared/lib/services/imagekit-server.ts`.

type ImageContext = 'hero' | 'secondary' | 'gallery' | 'card' | 'thumb';

export function getImageKitProps(
  url: string,
  context: ImageContext,
  options: { eager?: boolean } = {}
) {
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT || '';
  const isImageKitHost = url?.includes('ik.imagekit.io/');
  const hasTransform = url?.includes('tr=');

  let width = 0;
  let height = 0;
  let quality = 80;
  let sizes = '100vw';
  let fetchPriority: 'auto' | 'high' | 'low' | undefined = undefined;
  let loading: 'eager' | 'lazy' | undefined = undefined;

  switch (context) {
    case 'hero':
      width = 1920; height = 1080; quality = 82;
      sizes = '(max-width: 1024px) 100vw, 66vw';
      fetchPriority = 'high';
      loading = options.eager ? 'eager' : 'eager';
      break;
    case 'secondary':
      width = 1280; height = 720; quality = 82;
      sizes = '(max-width: 1024px) 100vw, 34vw';
      loading = options.eager ? 'eager' : 'lazy';
      break;
    case 'gallery':
      width = 1600; height = 900; quality = 75;
      sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px';
      loading = options.eager ? 'eager' : 'lazy';
      break;
    case 'card':
      width = 622; height = 350; quality = 85;
      sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px';
      loading = options.eager ? 'eager' : 'lazy';
      break;
    case 'thumb':
      width = 100; height = 100; quality = 80;
      sizes = '80px';
      loading = 'lazy';
      break;
  }

  const transformation = (!hasTransform && (isImageKitHost || (endpoint && url?.includes(endpoint))))
    ? [{ width, height, quality, format: 'auto' as const }]
    : [];

  return {
    src: url,
    width,
    height,
    sizes,
    transformation,
    fetchPriority,
    loading,
  };
}