import "../styles/globals.css";
import { Container, AppBar, Toolbar, Typography, Chip } from "@mui/material";
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: "1px solid #e2e8f0" }}>
            <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Weather Station
              </Typography>
              <Chip label="Private preview" color="primary" variant="outlined" />
            </Toolbar>
          </AppBar>
          <Container maxWidth="lg" sx={{ py: 4 }}>{children}</Container>
        </Providers>
      </body>
    </html>
  );
}
