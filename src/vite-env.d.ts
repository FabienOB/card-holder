/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * `BarcodeDetector` n'est pas encore dans la lib DOM de TypeScript.
 * Déclaration minimale, limitée à ce que l'app utilise réellement.
 */
interface DetectedBarcode {
  boundingBox: DOMRectReadOnly
  rawValue: string
  format: string
  cornerPoints: ReadonlyArray<{ x: number; y: number }>
}

interface BarcodeDetectorOptions {
  formats?: string[]
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions)
  static getSupportedFormats(): Promise<string[]>
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector
}

/** Événement d'installation PWA, spécifique à Chromium. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
}
