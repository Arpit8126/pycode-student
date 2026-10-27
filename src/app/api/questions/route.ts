import { NextRequest, NextResponse } from 'next/server'
import { LOCAL_QUESTIONS, LocalQuestion } from '@/lib/localQuestions'

// CORS headers to allow cross-origin requests from any frontend website
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
}

// Category metadata and human-readable titles
export const CATEGORY_METADATA: Record<string, { name: string; desc: string }> = {
  'python-ifelse': {
    name: '1. If / Else & Decision Making',
    desc: 'Conditionals, nested decisions, logical operators, and threshold testing',
  },
  'python-loops': {
    name: '2. Loops & Math Logic',
    desc: 'For/while iterations, primes, Fibonacci, and number properties',
  },
  'python-patterns': {
    name: '3. Pattern Printing',
    desc: 'Nested loops generating stars, numbers, and character grids',
  },
  'python-strings': {
    name: '4. String Methods & Algorithms',
    desc: 'Slicing, splits, joins, substring indexing, and string algorithms',
  },
  'python-lists-arrays': {
    name: '5. Lists & Array Algorithms',
    desc: 'List comprehensions, rotation, chunking, binary search, sorting, two-pointer techniques',
  },
  'python-dicts': {
    name: '6. Dictionaries & Sets',
    desc: 'Frequency count, hash maps, key-value lookup operations',
  },
  'python-oop': {
    name: '7. OOP, Lambdas & Exceptions',
    desc: 'Classes, encapsulation, inheritance, property decorators, dunders, custom errors',
  },
  'python-basics': {
    name: '3. Pattern Printing & Basics',
    desc: 'Fundamental algorithm logic and triangular patterns',
  },
  'numpy': {
    name: '8. NumPy Scientific Computing',
    desc: 'N-dimensional arrays, mathematical vectorization, matrix transformations',
  },
  'pandas': {
    name: '9. Pandas Data Science & Analysis',
    desc: 'DataFrames, null handling, indexing, group-by, merging, filtering datasets',
  },
  'matplotlib-seaborn': {
    name: '10. Matplotlib & Seaborn Visuals',
    desc: 'Bar plots, line charts, scatter plots, canvas styling, and distributions',
  },
}

// Allowed origins or base URL for redirecting students to practice
const DEFAULT_BASE_URL = 'https://pycode-student.vercel.app'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Determine dynamic base URL for practice redirect
    const origin = request.headers.get('x-forwarded-host') 
      ? `https://${request.headers.get('x-forwarded-host')}` 
      : (request.nextUrl.origin && !request.nextUrl.origin.includes('localhost') 
          ? request.nextUrl.origin 
          : DEFAULT_BASE_URL)

    const questionIdParam = searchParams.get('id')
    const categoryParam = searchParams.get('category')
    const difficultyParam = searchParams.get('difficulty')
    const searchParam = searchParams.get('search')
    const topicParam = searchParams.get('topic') // 'core-python' to filter out pandas/numpy/matplotlib
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    // 1. Single Question by ID
    if (questionIdParam) {
      const qId = parseInt(questionIdParam, 10)
      const found = LOCAL_QUESTIONS.find((q) => q.id === qId)
      if (!found) {
        return NextResponse.json(
          { success: false, error: `Question with ID ${qId} not found.` },
          { status: 404, headers: CORS_HEADERS }
        )
      }
      return NextResponse.json(
        {
          success: true,
          question: formatQuestion(found, origin),
        },
        { status: 200, headers: CORS_HEADERS }
      )
    }

    // 2. Filter Questions
    let filtered = LOCAL_QUESTIONS

    // Filter by Topic: if 'core-python' or 'python-only', exclude numpy, pandas, matplotlib-seaborn
    if (topicParam === 'core-python' || topicParam === 'python-only' || searchParams.get('core_python') === 'true') {
      const excluded = new Set(['numpy', 'pandas', 'matplotlib-seaborn'])
      filtered = filtered.filter((q) => !excluded.has(q.category))
    }

    // Filter by category
    if (categoryParam && categoryParam !== 'all') {
      filtered = filtered.filter((q) => q.category === categoryParam)
    }

    // Filter by difficulty
    if (difficultyParam && difficultyParam !== 'all') {
      filtered = filtered.filter((q) => q.difficulty.toLowerCase() === difficultyParam.toLowerCase())
    }

    // Filter by search keyword (title or description)
    if (searchParam && searchParam.trim()) {
      const term = searchParam.toLowerCase()
      filtered = filtered.filter(
        (q) => q.title.toLowerCase().includes(term) || q.description.toLowerCase().includes(term)
      )
    }

    // Compute category counts for convenient UI tabs
    const categoryCounts: Record<string, number> = {}
    LOCAL_QUESTIONS.forEach((q) => {
      categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1
    })

    const categoriesList = Object.keys(CATEGORY_METADATA)
      .filter((catId) => (categoryCounts[catId] || 0) > 0)
      .map((catId) => ({
        id: catId,
        name: CATEGORY_METADATA[catId].name,
        description: CATEGORY_METADATA[catId].desc,
        total_questions: categoryCounts[catId] || 0,
      }))

    // Sort by difficulty rank, then question ID
    const diffRank: Record<string, number> = { easy: 1, medium: 2, moderate: 2, hard: 3 }
    const sorted = [...filtered].sort((a, b) => {
      const rankA = diffRank[a.difficulty] || 99
      const rankB = diffRank[b.difficulty] || 99
      if (rankA !== rankB) return rankA - rankB
      return a.id - b.id
    })

    // Pagination (optional)
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || sorted.length) : sorted.length
    const paginated = sorted.slice(offset, offset + limit)

    const formattedQuestions = paginated.map((q) => formatQuestion(q, origin))

    return NextResponse.json(
      {
        success: true,
        total_questions: LOCAL_QUESTIONS.length,
        filtered_count: sorted.length,
        limit,
        offset,
        categories: categoriesList,
        questions: formattedQuestions,
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

function formatQuestion(q: LocalQuestion, baseUrl: string) {
  const meta = CATEGORY_METADATA[q.category] || {
    name: q.category,
    desc: '',
  }

  return {
    id: q.id,
    title: q.title,
    difficulty: q.difficulty,
    points: q.points,
    category: q.category,
    category_name: meta.name,
    category_description: meta.desc,
    description: q.description, // Complete pre-formatted HTML description (with examples, constraints, etc.)
    starter_code: q.starter_code,
    dataset_name: q.dataset_name || null,
    // Direct redirect link to attempt and code this question in pycode-student sandbox
    start_url: `${baseUrl}/practice/${q.id}`,
    practice_url: `${baseUrl}/practice/${q.id}`,
  }
}
