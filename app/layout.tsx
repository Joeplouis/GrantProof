import "./globals.css";
export const metadata = {
  title: "GrantProof — evidence to impact",
  description: "Every claim has evidence. Every grant dollar reconciles.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
