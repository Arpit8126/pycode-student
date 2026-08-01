import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const targetEmail = email.trim().toLowerCase();
    
    // Execute check_email_exists security definer RPC
    const { data: exists, error } = await (admin as any).rpc('check_email_exists', { email_to_check: targetEmail });

    if (error) {
      console.error('Error executing RPC check_email_exists:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exists: !!exists });
  } catch (err: any) {
    console.error('Unexpected error in verify-email API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
