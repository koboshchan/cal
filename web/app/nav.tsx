import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { requireUser, isAdmin } from "@/lib/auth";

export default async function Nav() {
  const { userId } = await auth();

  const admin = userId ? await isAdmin(await requireUser()) : false;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b">
      <Link href="/" className="font-semibold">
        cal
      </Link>
      <nav className="flex items-center gap-4">
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
