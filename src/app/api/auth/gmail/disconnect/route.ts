import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/mailbox", request.url));

  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set("gmail_access_token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });

  response.cookies.set("gmail_refresh_token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });

  return response;
}
