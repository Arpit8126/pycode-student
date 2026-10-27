import { NextRequest, NextResponse } from 'next/server'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'
import { CATEGORY_METADATA } from '../route'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
}

const DEFAULT_BASE_URL = 'https://pycode-student.vercel.app'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const qId = parseInt(id, 10)

    const origin = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : (request.nextUrl.origin && !request.nextUrl.origin.includes('localhost')
          ? request.nextUrl.origin
          : DEFAULT_BASE_URL)

    const question = LOCAL_QUESTIONS.find((q) => q.id === qId)
    if (!question) {
      return NextResponse.json(
        { success: false, error: `Question with ID ${qId} not found.` },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    const meta = CATEGORY_METADATA[question.category] || {
      name: question.category,
      desc: '',
    }

    return NextResponse.json(
      {
        success: true,
        question: {
          id: question.id,
          title: question.title,
          difficulty: question.difficulty,
          points: question.points,
          category: question.category,
          category_name: meta.name,
          category_description: meta.desc,
          description: question.description,
          starter_code: question.starter_code,
          dataset_name: question.dataset_name || null,
          start_url: `${origin}/practice/${question.id}`,
          practice_url: `${origin}/practice/${question.id}`,
        },
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
