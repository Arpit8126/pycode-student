import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const targetUsername = username.trim().toLowerCase();
    
    const { data: email, error } = await (admin as any).rpc('get_email_by_username', { 
      username_to_search: targetUsername 
    });

    if (error) {
      console.error('Error executing RPC get_email_by_username:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!email) {
      return NextResponse.json({ error: 'No account found with this username' }, { status: 404 });
    }

    return NextResponse.json({ email });
  } catch (err: any) {
    console.error('Unexpected error in username-email API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
