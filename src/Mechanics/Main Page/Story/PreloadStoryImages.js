/**
 * Starts loading every image URL in the supplied objects and resolves when
 * each image has either loaded or failed. Handles nested objects and arrays.
 */
export function preloadStoryImages(...sources) {
  const imageUrls = new Set();

  function collectImages(value) {
    if (typeof value === "string") {
      if (/\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(value)) {
        imageUrls.add(value);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collectImages);
      return;
    }

    if (value && typeof value === "object") {
      Object.values(value).forEach(collectImages);
    }
  }

  sources.forEach(collectImages);

  return Promise.all([...imageUrls].map((src) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ src, loaded: true });
    image.onerror = () => resolve({ src, loaded: false });
    image.src = src;

    // Cached images may already be complete before handlers fire.
    if (image.complete) {
      resolve({ src, loaded: image.naturalWidth > 0 });
    }
  })));
}
