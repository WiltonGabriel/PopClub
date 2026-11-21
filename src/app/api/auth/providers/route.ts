import { NextResponse } from "next/server";
import { isGoogleOAuthConfigured } from "@/lib/googleOAuth";
import { isEmailProviderConfigured } from "@/lib/emailService";

export async function GET() {
  return NextResponse.json(
    {
      googleEnabled: isGoogleOAuthConfigured(),
      emailConfigured: isEmailProviderConfigured(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
