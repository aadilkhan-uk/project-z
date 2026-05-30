import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getXeroAccessToken } from "@/lib/xero";

const XERO_API = "https://api.xero.com";

interface PublishInvoiceBody {
  type: "ACCPAY" | "ACCREC";
  contactId: string;
  date: string;
  dueDate: string;
  reference: string;
  status: string;
  lineDescription: string;
  accountCode: string;
  taxType: string;
  quantity: number;
  unitAmount: number;
}

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
    throw new Error("No Xero organisations connected. Complete the OAuth flow first.");
  }

  return connections[0].tenantId as string;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const tokenResult = await getXeroAccessToken(cookieStore);

  if (!tokenResult) {
    return NextResponse.json(
      { error: "Not connected to Xero. Please connect from the Xero tab." },
      { status: 401 }
    );
  }

  const { accessToken, applyRefreshedCookies } = tokenResult;

  function withCookies(res: NextResponse) {
    applyRefreshedCookies?.(res);
    return res;
  }

  let body: PublishInvoiceBody;
  try {
    body = await request.json();
  } catch {
    return withCookies(NextResponse.json({ error: "Invalid request body." }, { status: 400 }));
  }

  const {
    type,
    contactId,
    date,
    dueDate,
    reference,
    status,
    lineDescription,
    accountCode,
    taxType,
    quantity,
    unitAmount,
  } = body;

  if (!contactId || !date || !lineDescription || !accountCode) {
    return withCookies(
      NextResponse.json(
        { error: "Missing required fields: contactId, date, lineDescription, accountCode." },
        { status: 400 }
      )
    );
  }

  let tenantId: string;
  try {
    tenantId = await getXeroTenantId(accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get Xero tenant.";
    return withCookies(NextResponse.json({ error: message }, { status: 502 }));
  }

  const lineAmount = parseFloat((quantity * unitAmount).toFixed(2));

  const payload = {
    Invoices: [
      {
        Type: type,
        Contact: { ContactID: contactId },
        LineItems: [
          {
            Description: lineDescription,
            Quantity: quantity,
            UnitAmount: unitAmount,
            AccountCode: accountCode,
            TaxType: taxType,
            LineAmount: lineAmount,
          },
        ],
        Date: date,
        DueDate: dueDate,
        Reference: reference,
        Status: status,
      },
    ],
  };

  const xeroRes = await fetch(`${XERO_API}/api.xro/2.0/Invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-Tenant-Id": tenantId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await xeroRes.json();

  if (!xeroRes.ok) {
    console.error("Xero invoice creation failed:", data);
    const message =
      data?.Message ??
      data?.message ??
      data?.Detail ??
      "Xero rejected the invoice.";
    return withCookies(NextResponse.json({ error: message }, { status: xeroRes.status }));
  }

  const created = data?.Invoices?.[0];
  return withCookies(
    NextResponse.json({
      invoiceId: created?.InvoiceID,
      invoiceNumber: created?.InvoiceNumber,
      status: created?.Status,
    })
  );
}
