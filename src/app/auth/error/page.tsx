import Link from "next/link";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const errorMap: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  AccessDenied: "Access denied.",
  EmailSignin: "Email sign-in failed.",
  Verification: "Email verification failed or expired.",
};

export default function AuthErrorPage({ searchParams }: Props) {
  const raw = (searchParams?.["error"] as string) || "";
  const decoded = decodeURIComponent(raw);
  const message = errorMap[decoded] || decoded || "Authentication error.";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-3">Sign-in error</h1>
        <p className="text-sm text-gray-700 mb-6">{message}</p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}
