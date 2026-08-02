import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      const targetOrigin = isLocalEnv ? origin : (forwardedHost ? `https://${forwardedHost}` : origin);
      const response = NextResponse.redirect(`${targetOrigin}${next}`);

      if (next.startsWith('/reset-password')) {
        response.cookies.set('recovery_flow', 'true', {
          maxAge: 60, // 1 minute
          path: '/',
          httpOnly: false,
          sameSite: 'lax',
        });
      }

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
