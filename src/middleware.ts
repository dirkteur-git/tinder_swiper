import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth-whitelist";

const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/api/v1", // ingest-API gebruikt eigen Bearer-auth
  "/_next",
  "/icon.svg",
  "/manifest.json",
  "/sw.js"
];

function isPublic(pathname: string): boolean {
  if (pathname === "/favicon.ico") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Geforceerd uitloggen als ingelogd-maar-niet-toegestaan
  if (user && !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    if (!path.startsWith("/login")) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "not-allowed");
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Public route → laat door
  if (isPublic(path)) {
    // Ingelogd en op /login → naar root
    if (user && path === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Niet-ingelogd → naar login
  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Pak alles behalve:
     * - statische next-assets
     * - icon / manifest / sw / favicon
     * - image-extensies
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
