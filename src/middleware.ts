import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const userId = request.cookies.get("cob_user_id")?.value;
  const { pathname } = request.nextUrl;

  if (!userId && pathname !== "/signin") {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (userId && pathname === "/signin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // api/* excluded so JSON endpoints receive a 401 from their own handler,
  // not an HTML redirect.
  matcher: [
    "/((?!signin|api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
