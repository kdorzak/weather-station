"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Stack,
  Typography,
} from "@mui/material";

const LoginPage = () => {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const googleUrl = useMemo(() => `${apiBase}/auth/google`, [apiBase]);

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 480, boxShadow: 4 }}>
        <CardHeader title="Login" subheader="Sign in with Google to access the dashboard." />
        <CardContent>
          <Stack spacing={2}>
            <Button
              component="a"
              href={googleUrl}
              variant="contained"
              size="large"
              fullWidth
              sx={{ py: 1.2 }}
            >
              Continue with Google
            </Button>
            <Typography variant="body2" color="text.secondary">
              <Link href="/">Back to dashboard</Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
