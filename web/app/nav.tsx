import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { requireUser, isAdmin } from "@/lib/auth";

export default async function Nav() {
  const { userId } = await auth();

  const admin = userId ? await isAdmin(await requireUser()) : false;

  return (
    <header className="cal-toolbar">
      <Link href="/" className="cal-brand">
        <span className="cal-mark" aria-hidden="true"><span /><span /><span /><span /></span>
        cal
      </Link>
      <nav className="cal-account flex items-center gap-4">
        {userId ? (
          <>
            {admin && (
              <Link href="/admin" className="text-sm text-gray-600">
                Admin
              </Link>
            )}
            <UserButton />
          </>
        ) : (
          <>
            <SignInButton mode="modal" />
            <SignUpButton mode="modal" />
          </>
        )}
      </nav>
    </header>
  );
}
