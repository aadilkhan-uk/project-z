import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getGmailAccessToken } from "@/lib/gmail";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

const INVOICE_SUBJECT_KEYWORDS = [
  "invoice",
  "bill",
  "receipt",
  "statement",
  "payment due",
  "amount due",
  "remittance",
  "purchase order",
];

export interface GmailEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  /** True when at least one PDF or image attachment was found. */
  hasAttachment: boolean;
  attachments: { attachmentId: string; filename: string; mimeType: string }[];
  /** Why this email was flagged as a likely invoice. */
  detectionReason: "subject_keyword" | "pdf_attachment" | "both";
}

export async function GET() {
  const cookieStore = await cookies();
  const tokenResult = await getGmailAccessToken(cookieStore);

  if (!tokenResult) {
    return NextResponse.json({ error: "Not connected to Gmail." }, { status: 401 });
  }

  const { accessToken, applyRefreshedCookies } = tokenResult;

  function withCookies(res: NextResponse) {
    applyRefreshedCookies?.(res);
    return res;
  }

  const result = await fetchInvoiceEmails(accessToken);

  if ("error" in result) {
    return withCookies(NextResponse.json({ error: result.error }, { status: result.status }));
  }

  return withCookies(NextResponse.json({ emails: result.emails }));
}

async function fetchInvoiceEmails(
  accessToken: string
): Promise<{ emails: GmailEmail[] } | { error: string; status: number }> {
  // Casts a wide net via the Gmail query; we narrow down with our own heuristics below.
  const query = "newer_than:1d has:attachment OR subject:invoice OR subject:bill OR subject:receipt";
  const listUrl = `${GMAIL_API}/messages?maxResults=50&q=${encodeURIComponent(query)}`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const text = await listRes.text();
    console.error("Gmail messages list failed:", text);
    return { error: "Failed to fetch emails from Gmail.", status: listRes.status };
  }

  const listData = await listRes.json();
  const messageStubs: { id: string }[] = listData.messages ?? [];

  if (messageStubs.length === 0) {
    return { emails: [] };
  }

  // Fetch each message with format=full so the complete MIME part tree is
  // returned. This is required to discover attachments — format=metadata only
  // returns headers and omits the parts array entirely. Actual attachment bytes
  // are NOT downloaded here; they live behind a separate attachments endpoint.
  const messageResults = await Promise.allSettled(
    messageStubs.map(({ id }) =>
      fetch(`${GMAIL_API}/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => {
        if (!r.ok) throw new Error(`Message ${id} fetch failed: ${r.status}`);
        return r.json();
      })
    )
  );

  const emails: GmailEmail[] = [];

  for (const result of messageResults) {
    if (result.status === "rejected") continue;

    const msg = result.value;
    const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];

    const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value ?? "(no subject)";
    const from = headers.find((h: { name: string }) => h.name === "From")?.value ?? "";
    const date = headers.find((h: { name: string }) => h.name === "Date")?.value ?? "";

    const attachments = collectAttachments(msg.payload);
    const hasPdfAttachment = attachments.some(
      (a) => a.mimeType === "application/pdf" || a.filename.toLowerCase().endsWith(".pdf")
    );

    const subjectLower = subject.toLowerCase();
    const hasInvoiceKeyword = INVOICE_SUBJECT_KEYWORDS.some((kw) => subjectLower.includes(kw));

    if (!hasInvoiceKeyword && !hasPdfAttachment) continue;

    let detectionReason: GmailEmail["detectionReason"];
    if (hasInvoiceKeyword && hasPdfAttachment) detectionReason = "both";
    else if (hasPdfAttachment) detectionReason = "pdf_attachment";
    else detectionReason = "subject_keyword";

    emails.push({
      id: msg.id,
      subject,
      from,
      date,
      snippet: msg.snippet ?? "",
      hasAttachment: attachments.length > 0,
      attachments,
      detectionReason,
    });
  }

  return { emails };
}

interface MessagePart {
  mimeType?: string;
  filename?: string;
  body?: { attachmentId?: string };
  parts?: MessagePart[];
}

/**
 * Recursively walks the MIME tree and returns all parts that look like
 * invoice-relevant attachments (PDFs and common image types).
 */
function collectAttachments(
  part: MessagePart | undefined
): { attachmentId: string; filename: string; mimeType: string }[] {
  if (!part) return [];

  const results: { attachmentId: string; filename: string; mimeType: string }[] = [];

  const ALLOWED_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/tiff",
  ]);

  const filename = part.filename ?? "";
  const mimeType = part.mimeType ?? "";
  const attachmentId = part.body?.attachmentId;

  if (attachmentId && filename && ALLOWED_TYPES.has(mimeType)) {
    results.push({ attachmentId, filename, mimeType });
  }

  for (const child of part.parts ?? []) {
    results.push(...collectAttachments(child));
  }

  return results;
}
