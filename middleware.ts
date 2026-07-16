import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/signin" } });

export const config = {
  matcher: [
    // Everything except sign-in, auth routes, cron, and static assets requires sign-in
    "/((?!signin|api/auth|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
