const MAX_EDGE = 1200
const JPEG_QUALITY = 0.8

/**
 * Redimensionne toute photo importée à 1200 px sur le grand côté, JPEG 0.8.
 * Une photo de smartphone brute (~4 Mo) tombe autour de 150-300 Ko : IndexedDB
 * reste léger et l'export JSON reste transférable.
 */
export async function resizeImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmapCompat(file)
  try {
    const { width, height } = bitmap
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const targetW = Math.max(1, Math.round(width * scale))
    const targetH = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponible.')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) throw new Error('Conversion JPEG impossible.')
    return blob
  } finally {
    bitmap.close?.()
  }
}

/** `createImageBitmap` existe partout sur Chrome Android ; repli défensif. */
async function createImageBitmapCompat(file: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(file)
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image illisible.'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')?.drawImage(img, 0, 0)
    return (await createImageBitmap(canvas)) as ImageBitmap
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export function base64ToBlob(base64: string, mime = 'image/jpeg'): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
