import "./globals.css";
import "./vice-themes.css";
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
    <html lang="en" data-theme="vice-nights" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("grantproof.theme.v1");if(["vice-nights","ocean-drive","sunset-strip","classic"].includes(t))document.documentElement.dataset.theme=t}catch(e){}',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
