export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4">
      <header className="py-6 mb-6 border-b">
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="text-gray-600 mt-2">
          Explore and test the Project Management API endpoints
        </p>
      </header>
      {children}
    </div>
  );
}
