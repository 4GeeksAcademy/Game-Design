
/**
 * Starts loading every image URL in the supplied objects.
 * Handles nested objects, so it works with the story expression registry.
 */
export function preloadStoryImages(...sources) {
  const imageUrls = new Set();

  function collectImages(value) {
    if (typeof value === "string") {
      // Vite turns imported image files into URL strings.
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

  imageUrls.forEach((src) => {
    const image = new Image();
    image.src = src;
  });
}
