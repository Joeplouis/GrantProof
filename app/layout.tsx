import "./globals.css";
import "./vice-themes.css";
import "./sprig-theme.css";
import "./crm.css";
import "./assistant.css";
import AssistantBot from "@/components/AssistantBot";
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
    <html lang="en" data-theme="sprig" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("grantproof.theme.v1");if(["sprig","vice-nights","ocean-drive","sunset-strip","classic"].includes(t))document.documentElement.dataset.theme=t}catch(e){}',
          }}
        />
      </head>
      <body>
        {children}
        <AssistantBot />
      </body>
    </html>
  );
}
