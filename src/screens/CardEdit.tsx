import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Barcode } from '../components/Barcode'
import { ColorPicker } from '../components/ColorPicker'
import { LogoPicker } from '../components/LogoPicker'
import { ScannerView } from '../components/ScannerView'
import { newId, useCards } from '../hooks/useCards'
import { isScannerSupported } from '../hooks/useBarcodeScanner'
import { DEFAULT_COLOR } from '../lib/colors'
import { resizeImage } from '../lib/image'
import { guessFormat, validateCode } from '../lib/validation'
import { BARCODE_FORMATS, FORMAT_LABELS, type BarcodeFormat, type LoyaltyCard } from '../types'

export function CardEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getById, saveCard, removeCard, status } = useCards()
  const existing = id ? getById(id) : undefined

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [format, setFormat] = useState<BarcodeFormat>('EAN_13')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [notes, setNotes] = useState('')
  const [logoId, setLogoId] = useState<string | undefined>(undefined)
  const [imageBlob, setImageBlob] = useState<Blob | undefined>(undefined)

  const [scanning, setScanning] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; code?: string; global?: string }>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const hydratedRef = useRef(false)
  const codeInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  // Le store se charge de façon asynchrone : on hydrate le formulaire
  // dès que la carte à éditer est disponible, une seule fois.
  useEffect(() => {
    if (!existing || hydratedRef.current) return
    hydratedRef.current = true
    setName(existing.name)
    setCode(existing.code)
    setFormat(existing.format)
    setColor(existing.color)
    setNotes(existing.notes ?? '')
    setLogoId(existing.logoId)
    setImageBlob(existing.imageBlob)
  }, [existing])

  const previewUrl = useMemo(() => (imageBlob ? URL.createObjectURL(imageBlob) : null), [imageBlob])
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const codeError = code.trim() ? validateCode(code.trim(), format) : null
  const scannerAvailable = useMemo(() => isScannerSupported(), [])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setImageBlob(await resizeImage(file))
      setErrors((e) => ({ ...e, global: undefined }))
    } catch {
      setErrors((e) => ({ ...e, global: "Cette image n'a pas pu être traitée." }))
    }
  }

  const submit = async () => {
    const trimmedName = name.trim()
    const trimmedCode = code.trim()
    const next: typeof errors = {}

    if (!trimmedName) next.name = 'Le nom est obligatoire.'
    if (trimmedCode) {
      const codeIssue = validateCode(trimmedCode, format)
      if (codeIssue) next.code = codeIssue
    } else if (!imageBlob) {
      next.code = 'Saisissez un code, ou ajoutez une photo de la carte.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      const card: LoyaltyCard = {
        id: existing?.id ?? newId(),
        name: trimmedName,
        code: trimmedCode,
        format,
        imageBlob,
        logoId,
        color,
        notes: notes.trim() || undefined,
        createdAt: existing?.createdAt ?? Date.now(),
        lastUsedAt: existing?.lastUsedAt,
        usageCount: existing?.usageCount ?? 0,
      }
      await saveCard(card)
      navigate('/', { replace: true })
    } catch (e) {
      setErrors({ global: e instanceof Error ? e.message : "L'enregistrement a échoué." })
      setSaving(false)
    }
  }

  if (id && !existing) {
    if (status === 'loading') return <div className="min-h-full bg-white" />
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-white p-6">
        <p className="text-slate-700">Cette carte n’existe plus.</p>
        <button onClick={() => navigate('/', { replace: true })} className="min-h-touch rounded-lg bg-slate-800 px-5 py-3 text-white">
          Retour à la liste
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 pb-32">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-2 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Annuler et revenir"
          className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-600 active:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-slate-900">{existing ? 'Modifier la carte' : 'Nouvelle carte'}</h1>
      </header>

      <div className="space-y-6 p-4">
        {/* 1. Scanner — priorité visuelle, masqué si l'API n'existe pas. */}
        {scannerAvailable && (
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-4 py-4 text-base font-medium text-white active:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" strokeLinecap="round" />
              <path d="M3 12h18" strokeLinecap="round" />
            </svg>
            Scanner le code-barres
          </button>
        )}

        {/* 2. Saisie manuelle */}
        <section className="space-y-3">
          <label htmlFor="code" className="block text-sm font-medium text-slate-700">
            Code
          </label>
          <input
            id="code"
            ref={codeInputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            value={code}
            onChange={(e) => {
              const value = e.target.value
              setCode(value)
              setErrors((err) => ({ ...err, code: undefined }))
              // Format deviné tant que l'utilisateur n'y a pas touché lui-même.
              if (!existing && value.trim()) setFormat((current) => (current === 'EAN_13' ? guessFormat(value) : current))
            }}
            placeholder="Numéro de la carte"
            aria-invalid={!!(errors.code || codeError)}
            aria-describedby="code-error"
            className={`h-12 w-full rounded-lg border bg-white px-3 font-mono text-base text-slate-900 focus:outline-none ${
              errors.code || codeError ? 'border-red-500' : 'border-slate-300 focus:border-slate-500'
            }`}
          />

          <label htmlFor="format" className="block text-sm font-medium text-slate-700">
            Format
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as BarcodeFormat)
              setErrors((err) => ({ ...err, code: undefined }))
            }}
            className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-slate-500 focus:outline-none"
          >
            {BARCODE_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>

          <p id="code-error" className="min-h-[1.25rem] text-sm text-red-600" role="status">
            {errors.code ?? codeError ?? ''}
          </p>

          {/* Aperçu : confirme immédiatement que le code est encodable. */}
          {code.trim() && !codeError && (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <Barcode code={code.trim()} format={format} className="mx-auto h-20 w-full max-w-[260px]" />
            </div>
          )}
        </section>

        {/* 3. Photo */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-700">Photo de la carte</h2>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          {previewUrl ? (
            <div className="space-y-2">
              <img src={previewUrl} alt="Aperçu de la carte" className="max-h-48 w-full rounded-lg object-contain" />
              <button
                type="button"
                onClick={() => setImageBlob(undefined)}
                className="min-h-touch text-sm text-red-600 underline"
              >
                Retirer la photo
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-touch flex-1 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700"
              >
                Prendre une photo
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-touch flex-1 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700"
              >
                Choisir dans la galerie
              </button>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Nom <span className="text-red-600">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setErrors((err) => ({ ...err, name: undefined }))
            }}
            placeholder="Carrefour, Fnac…"
            aria-invalid={!!errors.name}
            aria-describedby="name-error"
            className={`h-12 w-full rounded-lg border bg-white px-3 text-base text-slate-900 focus:outline-none ${
              errors.name ? 'border-red-500' : 'border-slate-300 focus:border-slate-500'
            }`}
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-red-600" role="status">
              {errors.name}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-700">Couleur</h2>
          <ColorPicker value={color} onChange={setColor} />
        </section>

        {!imageBlob && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-slate-700">Pictogramme</h2>
            <LogoPicker value={logoId} onChange={setLogoId} />
          </section>
        )}

        <section className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-base text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </section>

        {errors.global && (
          <p className="text-sm text-red-600" role="alert">
            {errors.global}
          </p>
        )}

        {existing && (
          <section className="border-t border-slate-200 pt-4">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm text-slate-700">Supprimer « {existing.name} » ?</span>
                <button onClick={() => setConfirmDelete(false)} className="min-h-touch px-3 text-sm text-slate-600">
                  Non
                </button>
                <button
                  onClick={async () => {
                    try {
                      await removeCard(existing.id)
                      navigate('/', { replace: true })
                    } catch (e) {
                      setErrors({ global: e instanceof Error ? e.message : 'Suppression impossible.' })
                    }
                  }}
                  className="min-h-touch rounded-lg bg-red-600 px-4 text-sm font-medium text-white"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="min-h-touch text-sm text-red-600">
                Supprimer cette carte
              </button>
            )}
          </section>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <button
          onClick={submit}
          disabled={saving}
          className="min-h-touch w-full rounded-lg bg-slate-900 py-3.5 text-base font-semibold text-white active:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {scanning && (
        <ScannerView
          onClose={() => setScanning(false)}
          onFallback={() => {
            setScanning(false)
            codeInputRef.current?.focus()
          }}
          onResult={({ code: scanned, format: scannedFormat }) => {
            setCode(scanned)
            setFormat(scannedFormat)
            setErrors((err) => ({ ...err, code: undefined }))
            setScanning(false)
          }}
        />
      )}
    </div>
  )
}
