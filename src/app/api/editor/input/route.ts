import { NextResponse } from 'next/server'

// Maps execId -> resolved value
const submittedInputValues = new Map<string, string>()

// Maps execId -> resolve function for long-polling fallback
const pendingInputResolvers = new Map<string, (value: string) => void>()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const execId = searchParams.get('execId') || 'default'
  const isPoll = searchParams.get('poll') === 'true'

  // Short-polling check: return value immediately if present, otherwise return __PENDING__
  if (isPoll) {
    if (submittedInputValues.has(execId)) {
      const val = submittedInputValues.get(execId) || ''
      submittedInputValues.delete(execId)
      return new NextResponse(val)
    }
    return new NextResponse('__PENDING__')
  }

  // Fallback Long-polling
  const inputVal = await new Promise<string>((resolve) => {
    const existing = pendingInputResolvers.get(execId)
    if (existing) {
      existing('')
    }
    pendingInputResolvers.set(execId, resolve)
    setTimeout(() => {
      if (pendingInputResolvers.get(execId) === resolve) {
        resolve('')
        pendingInputResolvers.delete(execId)
      }
    }, 45000)
  })

  return new NextResponse(inputVal)
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const execId = searchParams.get('execId') || 'default'
  
  try {
    const body = await request.json()
    const value = body.value || ''
    
    // Save value for short-polling
    submittedInputValues.set(execId, value)
    
    // Resolve long-polling if active
    const resolve = pendingInputResolvers.get(execId)
    if (resolve) {
      resolve(value)
      pendingInputResolvers.delete(execId)
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
  }
}
