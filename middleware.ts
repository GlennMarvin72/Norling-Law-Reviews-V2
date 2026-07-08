export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Everything except auth routes, cron, and static assets requires sign-in
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
