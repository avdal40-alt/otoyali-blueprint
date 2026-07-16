export type PreparedImageVariantName = "original" | "large" | "card" | "thumb";

export type PreparedImageVariant = {
  name: PreparedImageVariantName;
  file: File;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  extension: string;
};

export type PreparedImageSet = {
  variants: Record<PreparedImageVariantName, PreparedImageVariant>;
  width: number;
  height: number;
  aspectRatio: number;
};

const variantConfig: Record<PreparedImageVariantName, { maxDimension: number; quality: number }> = {
  original: { maxDimension: 2400, quality: 0.9 },
  large: { maxDimension: 1600, quality: 0.84 },
  card: { maxDimension: 800, quality: 0.8 },
  thumb: { maxDimension: 300, quality: 0.76 }
};

export async function prepareImageVariants(file: File): Promise<PreparedImageSet> {
  const source = await decodeImage(file);
  const width = getSourceWidth(source);
  const height = getSourceHeight(source);

  try {
    const variants = {
      original: await renderVariant(source, file, "original", width, height),
      large: await renderVariant(source, file, "large", width, height),
      card: await renderVariant(source, file, "card", width, height),
      thumb: await renderVariant(source, file, "thumb", width, height)
    };

    return {
      variants,
      width: variants.original.width,
      height: variants.original.height,
      aspectRatio: variants.original.width / variants.original.height
    };
  } finally {
    if ("close" in source && typeof source.close === "function") {
      source.close();
    }
  }
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall back to an HTMLImageElement decoder below.
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be decoded"));
    };
    image.src = url;
  });
}

async function renderVariant(
  source: ImageBitmap | HTMLImageElement,
  inputFile: File,
  name: PreparedImageVariantName,
  sourceWidth: number,
  sourceHeight: number
): Promise<PreparedImageVariant> {
  const { maxDimension, quality } = variantConfig[name];
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });

  if (!context) {
    throw new Error("Canvas context is not available");
  }

  context.drawImage(source, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, "image/webp", quality).catch(() => canvasToBlob(canvas, "image/jpeg", quality));
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const file = new File([blob], `${sanitizeBaseName(inputFile.name)}-${name}.${extension}`, {
    type: blob.type,
    lastModified: Date.now()
  });

  return {
    name,
    file,
    width,
    height,
    mimeType: file.type,
    sizeBytes: file.size,
    extension
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Image variant could not be created"));
    }, mimeType, quality);
  });
}

function getSourceWidth(source: ImageBitmap | HTMLImageElement) {
  return "naturalWidth" in source ? source.naturalWidth : source.width;
}

function getSourceHeight(source: ImageBitmap | HTMLImageElement) {
  return "naturalHeight" in source ? source.naturalHeight : source.height;
}

function sanitizeBaseName(fileName: string) {
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, "");
  return nameWithoutExtension.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "image";
}
