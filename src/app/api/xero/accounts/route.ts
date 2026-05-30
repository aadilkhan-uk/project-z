import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getXeroAccessToken } from "@/lib/xero";

const XERO_API = "https://api.xero.com";

async function getXeroTenantId(accessToken: string): Promise<string> {
  const res = await fetch(`${XERO_API}/connections`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Xero connections: ${res.status}`);
  }

  const connections = await res.json();

  if (!Array.isArray(connections) || connections.length === 0) {
    throw new Error("No Xero organisations connected.");
  }

  return connections[0].tenantId as string;
}

export async function GET() {
  const cookieStore = await cookies();
  const tokenResult = await getXeroAccessToken(cookieStore);

  if (!tokenResult) {
    return NextResponse.json({ error: "Not connected to Xero." }, { status: 401 });
  }

  const { accessToken, applyRefreshedCookies } = tokenResult;

  function withCookies(res: NextResponse) {
    applyRefreshedCookies?.(res);
    return res;
  }

  let tenantId: string;
  try {
    tenantId = await getXeroTenantId(accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get Xero tenant.";
    return withCookies(NextResponse.json({ error: message }, { status: 502 }));
  }

  const xeroRes = await fetch(`${XERO_API}/api.xro/2.0/Accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-Tenant-Id": tenantId,
      Accept: "application/json",
    },
  });

  if (!xeroRes.ok) {
    const text = await xeroRes.text();
    console.error("Xero accounts fetch failed:", text);
    return withCookies(
      NextResponse.json(
        { error: "Failed to fetch accounts from Xero." },
        { status: xeroRes.status }
      )
    );
  }

  const data = await xeroRes.json();
  const accounts = (data?.Accounts ?? [])
    .filter((a: { Status?: string }) => a.Status !== "ARCHIVED")
    .map((a: { AccountID: string; Code?: string; Name: string; Type: string }) => ({
      AccountID: a.AccountID,
      Code: a.Code ?? "",
      Name: a.Name,
      Type: a.Type,
    }));

  return withCookies(NextResponse.json({ accounts }));
}
