export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        The page you’re looking for doesn’t exist or may have been moved.
      </p>
      <a href="/" className="mt-4 inline-block text-primary underline">
        Go home
      </a>
    </div>
  );
}
