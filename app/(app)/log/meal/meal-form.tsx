'use client'

import { useActionState, useRef, useState } from 'react'
import { saveMeal, type MealState } from './actions'

type Analysis = {
  meal_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence: 'low' | 'medium' | 'high'
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export type RecentMeal = {
  mealName: string
  description: string
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

export function MealForm({ recent = [] }: { recent?: RecentMeal[] }) {
  const [state, formAction, pending] = useActionState<MealState, FormData>(
    saveMeal,
    undefined,
  )

  // Controlled fields so photo analysis can prefill them before saving.
  const [mealName, setMealName] = useState('')
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [source, setSource] = useState<'manual' | 'photo'>('manual')

  // Photo analysis state.
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<Analysis['confidence'] | null>(
    null,
  )
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setAnalyzeError(null)
    if (!ALLOWED.includes(file.type)) {
      setAnalyzeError('Use a JPEG, PNG, GIF, or WebP image.')
      return
    }

    setAnalyzing(true)
    setConfidence(null)

    // Downscale before upload — food ID doesn't need high resolution, and a
    // smaller payload avoids serverless body-size limits and cuts image tokens.
    let dataUrl: string
    let mediaType: string
    try {
      const shrunk = await downscaleImage(file)
      dataUrl = shrunk.dataUrl
      mediaType = shrunk.mediaType
    } catch {
      // Fall back to the original if the browser can't decode/canvas it.
      dataUrl = await readAsDataURL(file)
      mediaType = file.type
    }
    setPreview(dataUrl)

    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mediaType,
          hint: mealName, // optional text hint if the user already typed one
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAnalyzeError(data.error ?? 'Could not analyze the photo.')
        return
      }
      const a = data as Analysis
      // Prefill for the user to review and edit before saving.
      setMealName(a.meal_name)
      setCalories(String(a.calories))
      setProtein(String(a.protein_g))
      setCarbs(String(a.carbs_g))
      setFat(String(a.fat_g))
      setConfidence(a.confidence)
      setSource('photo')
    } catch {
      setAnalyzeError('Network error. Please try again.')
    } finally {
      setAnalyzing(false)
      // The photo is only used for analysis — drop it once we have the estimate.
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function prefillFrom(meal: RecentMeal) {
    setMealName(meal.mealName)
    setDescription(meal.description)
    setCalories(meal.calories != null ? String(meal.calories) : '')
    setProtein(meal.proteinG != null ? String(meal.proteinG) : '')
    setCarbs(meal.carbsG != null ? String(meal.carbsG) : '')
    setFat(meal.fatG != null ? String(meal.fatG) : '')
    setSource('manual')
    setConfidence(null)
    setAnalyzeError(null)
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="source" value={source} />

      {/* Recent meals — tap to re-log with saved macros */}
      {recent.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm font-medium">Recent meals</p>
          <p className="mt-1 text-xs text-muted">
            Tap one to pre-fill the form, then review and save.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {recent.map((meal) => (
              <button
                key={meal.mealName}
                type="button"
                onClick={() => prefillFrom(meal)}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-accent"
              >
                <span className="font-medium">{meal.mealName}</span>
                {meal.calories != null && (
                  <span className="ml-1.5 text-xs text-muted">
                    {meal.calories} kcal
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Photo analysis */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm font-medium">Estimate from a photo</p>
        <p className="mt-1 text-xs text-muted">
          Take or upload a photo — Claude estimates the macros for you to review.
          The photo is never stored.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />

        <button
          type="button"
          disabled={analyzing}
          onClick={() => fileRef.current?.click()}
          className="mt-4 w-full rounded-xl border border-dashed border-border bg-surface-2 py-6 text-sm text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60"
        >
          {analyzing ? 'Analyzing photo…' : '📷 Take or upload a meal photo'}
        </button>

        {preview && analyzing && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Meal preview"
            className="mt-3 max-h-48 w-full rounded-xl object-cover opacity-70"
          />
        )}
        {analyzeError && (
          <p className="mt-2 text-sm text-danger">{analyzeError}</p>
        )}
        {confidence && !analyzeError && (
          <p className="mt-2 text-sm text-success">
            Estimated below — {confidence} confidence. Review and edit before
            saving.
          </p>
        )}
      </section>

      {/* Details */}
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="meal_name" className="text-sm font-medium">
            Meal name
          </label>
          <input
            id="meal_name"
            name="meal_name"
            className="input"
            placeholder="e.g. Chicken curry with rice"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-muted">(optional)</span>
          </label>
          <input
            id="description"
            name="description"
            className="input"
            placeholder="Portion, ingredients, notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="meal_time" className="text-sm font-medium">
            Time <span className="text-muted">(optional)</span>
          </label>
          <input id="meal_time" name="meal_time" type="time" className="input" />
        </div>
      </section>

      {/* Nutrition */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="mb-4 text-sm font-medium">Nutrition</p>
        <div className="flex flex-col gap-2">
          <label htmlFor="calories" className="text-sm text-muted">
            Calories (kcal)
          </label>
          <input
            id="calories"
            name="calories"
            type="number"
            inputMode="numeric"
            className="input"
            placeholder="650"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            required
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Macro
            name="protein_g"
            label="Protein (g)"
            value={protein}
            onChange={setProtein}
          />
          <Macro
            name="carbs_g"
            label="Carbs (g)"
            value={carbs}
            onChange={setCarbs}
          />
          <Macro name="fat_g" label="Fat (g)" value={fat} onChange={setFat} />
        </div>
      </section>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Log meal'}
      </button>
    </form>
  )
}

function Macro({
  name,
  label,
  value,
  onChange,
}: {
  name: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-xs text-muted">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        inputMode="decimal"
        className="input"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Resize so the longest edge is at most `maxDim`px and re-encode as JPEG.
// `imageOrientation: 'from-image'` applies EXIF rotation so phone photos aren't
// sideways. Returns a data URL and its media type.
async function downscaleImage(
  file: File,
  maxDim = 1024,
  quality = 0.8,
): Promise<{ dataUrl: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  })
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(bitmap, 0, 0, width, height)

    return { dataUrl: canvas.toDataURL('image/jpeg', quality), mediaType: 'image/jpeg' }
  } finally {
    bitmap.close()
  }
}
