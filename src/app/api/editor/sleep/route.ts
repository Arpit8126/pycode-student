import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ms = parseInt(searchParams.get('ms') || '100', 10)
  
  // Sleep synchronously on the server
  await new Promise(resolve => setTimeout(resolve, ms))
  
  return new NextResponse('')
}
