import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("xero_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Xero." },
      { status: 401 }
    );
  }

  const search = request.nextUrl.searchParams.get("search") ?? "";

  let tenantId: string;
  try {
    tenantId = await getXeroTenantId(accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get Xero tenant.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const url = new URL(`${XERO_API}/api.xro/2.0/Contacts`);
  if (search.trim()) {
    url.searchParams.set("searchTerm", search.trim());
  }
  // Limit results to keep the dropdown snappy
  url.searchParams.set("includeArchived", "false");

  const xeroRes = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-Tenant-Id": tenantId,
      Accept: "application/json",
    },
  });

  if (!xeroRes.ok) {
    const text = await xeroRes.text();
    console.error("Xero contacts fetch failed:", text);
    return NextResponse.json(
      { error: "Failed to fetch contacts from Xero." },
      { status: xeroRes.status }
    );
  }

  const data = await xeroRes.json();
  const contacts: { ContactID: string; Name: string }[] =
    (data?.Contacts ?? []).map((c: { ContactID: string; Name: string }) => ({
      ContactID: c.ContactID,
      Name: c.Name,
    }));

  return NextResponse.json({ contacts });
}

/* -------------------------------------------------------------------------- */
/*  POST /api/xero/contacts — create a new contact                            */
/* -------------------------------------------------------------------------- */

interface CreateContactBody {
  name: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  accountNumber?: string;
  isSupplier?: boolean;
  isCustomer?: boolean;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("xero_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected to Xero." }, { status: 401 });
  }

  let body: CreateContactBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
  }

  let tenantId: string;
  try {
    tenantId = await getXeroTenantId(accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get Xero tenant.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const contactPayload: Record<string, unknown> = { Name: body.name.trim() };
  if (body.firstName?.trim()) contactPayload.FirstName = body.firstName.trim();
  if (body.lastName?.trim()) contactPayload.LastName = body.lastName.trim();
  if (body.emailAddress?.trim()) contactPayload.EmailAddress = body.emailAddress.trim();
  if (body.accountNumber?.trim()) contactPayload.AccountNumber = body.accountNumber.trim();
  if (body.isSupplier !== undefined) contactPayload.IsSupplier = body.isSupplier;
  if (body.isCustomer !== undefined) contactPayload.IsCustomer = body.isCustomer;

  const xeroRes = await fetch(`${XERO_API}/api.xro/2.0/Contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-Tenant-Id": tenantId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ Contacts: [contactPayload] }),
  });

  const data = await xeroRes.json();

  if (!xeroRes.ok) {
    console.error("Xero contact creation failed:", data);
    const message =
      data?.Message ?? data?.message ?? data?.Detail ?? "Xero rejected the contact.";
    return NextResponse.json({ error: message }, { status: xeroRes.status });
  }

  const created = data?.Contacts?.[0];
  return NextResponse.json({
    contact: {
      ContactID: created?.ContactID as string,
      Name: created?.Name as string,
    },
  });
}
