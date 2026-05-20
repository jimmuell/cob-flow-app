export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-slate-50 min-h-screen">{children}</div>;
}
