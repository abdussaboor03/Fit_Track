import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { foodPreferenceBias } from '@/lib/fitness/preferences'
import type { FoodPreferences } from '@/lib/fitness/types'

// Meal photo analysis. The image is sent to Claude for a one-shot nutrition
// estimate and then discarded — it is never written to the database or storage.

export const runtime = 'nodejs'

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
const ALLOWED_MEDIA: MediaType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

const SYSTEM_PROMPT = `You are a nutrition estimator. You will be shown a photo of a meal.
Estimate the meal name and its nutrition. If portion size is ambiguous, assume a
standard single-adult restaurant portion. Account for visible oil/ghee/sauce
quantity in curries — these add significant calories.`

// Structured outputs guarantee schema-valid JSON, so no fence-stripping needed.
const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    meal_name: { type: 'string' },
    calories: { type: 'integer' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: [
    'meal_name',
    'calories',
    'protein_g',
    'carbs_g',
    'fat_g',
    'confidence',
  ],
  additionalProperties: false,
} as const

export async function POST(request: NextRequest) {
  // Require an authenticated user.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Meal photo analysis is not configured.' },
      { status: 503 },
    )
  }

  let body: { imageBase64?: string; mediaType?: string; hint?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const imageBase64 = (body.imageBase64 ?? '').replace(
    /^data:[^;]+;base64,/,
    '',
  )
  const mediaType = body.mediaType as MediaType
  const hint = (body.hint ?? '').trim().slice(0, 300)

  if (!imageBase64) {
    return NextResponse.json({ error: 'No image provided.' }, { status: 400 })
  }
  if (!ALLOWED_MEDIA.includes(mediaType)) {
    return NextResponse.json(
      { error: 'Unsupported image type. Use JPEG, PNG, GIF, or WebP.' },
      { status: 400 },
    )
  }

  // Bias the estimate with the user's dietary restriction + food preferences.
  const { data: profile } = await supabase
    .from('profiles')
    .select('dietary_restriction, food_preferences')
    .eq('id', user.id)
    .maybeSingle()

  const dietNotes: string[] = []
  if (profile?.dietary_restriction) {
    dietNotes.push(`Dietary restriction: ${profile.dietary_restriction}.`)
  }
  const bias = foodPreferenceBias(
    profile?.food_preferences as FoodPreferences | null,
  )
  if (bias) {
    dietNotes.push(bias)
  }

  const textParts = [
    hint ? `The user says this is: "${hint}".` : '',
    dietNotes.join(' '),
    'Estimate the meal name, total calories (kcal), and macros in grams.',
  ].filter(Boolean)

  const anthropic = new Anthropic()

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: MEAL_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            { type: 'text', text: textParts.join('\n') },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return NextResponse.json(
        { error: 'The image could not be analyzed. Try entering the meal manually.' },
        { status: 422 },
      )
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text block in response')
    }

    const parsed = JSON.parse(textBlock.text)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[analyze-meal] error:', err)
    return NextResponse.json(
      { error: 'Could not analyze the photo. Please try again or enter it manually.' },
      { status: 502 },
    )
  }
}
