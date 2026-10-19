export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-linear-to-b from-background to-secondary/40 px-4 py-10">
      {children}
    </main>
  );
}
