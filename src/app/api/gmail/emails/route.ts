import mammoth from "mammoth";
import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import OpenAI from "openai";

import {getGmailAccessToken} from "@/lib/gmail";
import type {ExtractedInvoice} from "@/features/invoices/types/invoice";

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
  attachments: {attachmentId: string; filename: string; mimeType: string}[];
  /** Why this email was flagged as a likely invoice. */
  detectionReason: "subject_keyword" | "pdf_attachment" | "both";
  /** Decoded plain-text body of the email. */
  body: string;
  /** Structured invoice data extracted from the email body, or null if none found. */
  extractedInvoice?: ExtractedInvoice | null;
  /** Which part of the email the invoice data was extracted from. */
  extractionSource?: "body" | "attachment";
  /** Filename of the attachment used for extraction, when extractionSource is "attachment". */
  extractionAttachmentName?: string;
}

export async function GET() {
  const cookieStore = await cookies();
  const tokenResult = await getGmailAccessToken(cookieStore);

  if (!tokenResult) {
    return NextResponse.json({error: "Not connected to Gmail."}, {status: 401});
  }

  const {accessToken, applyRefreshedCookies} = tokenResult;

  function withCookies(res: NextResponse) {
    applyRefreshedCookies?.(res);
    return res;
  }

  const result = await fetchInvoiceEmails(accessToken);

  if ("error" in result) {
    return withCookies(
      NextResponse.json({error: result.error}, {status: result.status}),
    );
  }

  const emails = await enrichEmailsWithBodyExtraction(result.emails, accessToken);

  return withCookies(NextResponse.json({emails}));
}

async function fetchInvoiceEmails(
  accessToken: string,
): Promise<{emails: GmailEmail[]} | {error: string; status: number}> {
  // Casts a wide net via the Gmail query; we narrow down with our own heuristics below.
  const fifteenMinutesAgo = Math.floor((Date.now() - 15 * 60 * 1000) / 1000);
  const query = `after:${fifteenMinutesAgo} has:attachment OR subject:invoice OR subject:bill OR subject:receipt`;
  const listUrl = `${GMAIL_API}/messages?maxResults=50&q=${encodeURIComponent(query)}`;

  const listRes = await fetch(listUrl, {
    headers: {Authorization: `Bearer ${accessToken}`},
  });

  if (!listRes.ok) {
    const text = await listRes.text();
    console.error("Gmail messages list failed:", text);
    return {
      error: "Failed to fetch emails from Gmail.",
      status: listRes.status,
    };
  }

  const listData = await listRes.json();
  const messageStubs: {id: string}[] = listData.messages ?? [];

  if (messageStubs.length === 0) {
    return {emails: []};
  }

  // Fetch each message with format=full so the complete MIME part tree is
  // returned. This is required to discover attachments — format=metadata only
  // returns headers and omits the parts array entirely. Actual attachment bytes
  // are NOT downloaded here; they live behind a separate attachments endpoint.
  const messageResults = await Promise.allSettled(
    messageStubs.map(({id}) =>
      fetch(`${GMAIL_API}/messages/${id}?format=full`, {
        headers: {Authorization: `Bearer ${accessToken}`},
      }).then((r) => {
        if (!r.ok) throw new Error(`Message ${id} fetch failed: ${r.status}`);
        return r.json();
      }),
    ),
  );

  const emails: GmailEmail[] = [];

  for (const result of messageResults) {
    if (result.status === "rejected") continue;

    const msg = result.value;
    const headers: {name: string; value: string}[] = msg.payload?.headers ?? [];

    const subject =
      headers.find((h: {name: string}) => h.name === "Subject")?.value ??
      "(no subject)";
    const from =
      headers.find((h: {name: string}) => h.name === "From")?.value ?? "";
    const date =
      headers.find((h: {name: string}) => h.name === "Date")?.value ?? "";

    const attachments = collectAttachments(msg.payload);
    const hasPdfAttachment = attachments.some(
      (a) =>
        a.mimeType === "application/pdf" ||
        a.filename.toLowerCase().endsWith(".pdf"),
    );

    const subjectLower = subject.toLowerCase();
    const hasInvoiceKeyword = INVOICE_SUBJECT_KEYWORDS.some((kw) =>
      subjectLower.includes(kw),
    );

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
      body: decodeEmailBody(msg.payload),
      hasAttachment: attachments.length > 0,
      attachments,
      detectionReason,
    });
  }

  return {emails};
}

interface MessagePart {
  mimeType?: string;
  filename?: string;
  body?: {attachmentId?: string; data?: string};
  parts?: MessagePart[];
}

const EMAIL_BODY_EXTRACTION_PROMPT =
  `You are an invoice data extraction assistant.

Analyse the email body provided by the user.

Always respond with a single JSON object in one of these two shapes:

1. If the email contains payment, bill, or invoice details:
{
  "found": true,
  "invoice_number": "<string or null>",
  "invoice_date": "<YYYY-MM-DD or null>",
  "due_date": "<YYYY-MM-DD or null>",
  "vendor": {
    "name": "<string or null>",
    "address": "<string or null>",
    "email": "<string or null>",
    "phone": "<string or null>",
    "tax_id": "<string or null>"
  },
  "bill_to": {
    "name": "<string or null>",
    "address": "<string or null>",
    "email": "<string or null>"
  },
  "line_items": [
    {
      "description": "<string>",
      "quantity": <number>,
      "unit_price": <number>,
      "total": <number>
    }
  ],
  "subtotal": <number or null>,
  "tax_rate": <number or null>,
  "tax_amount": <number or null>,
  "discount": <number or null>,
  "total_amount": <number or null>,
  "currency": "<ISO 4217 code or null>",
  "payment_terms": "<string or null>",
  "notes": "<string or null>"
}

2. If the email does NOT contain payment or invoice details:
{ "found": false }

Do not include any text outside the JSON object.`.trim();

/**
 * Takes the list of flagged emails from fetchInvoiceEmails and attempts to
 * extract structured invoice data from each email body via an LLM.
 * If the body yields nothing and the email has attachments, each attachment
 * is tried in order until one produces invoice data.
 * Runs all extractions concurrently.
 */
async function enrichEmailsWithBodyExtraction(
  emails: GmailEmail[],
  accessToken: string,
): Promise<GmailEmail[]> {
  const results = await Promise.allSettled(
    emails.map(async (email) => {
      const bodyExtraction = await extractInvoiceFromEmailBody(email.body);

      if (bodyExtraction !== "No Payment Details") {
        return {...email, extractedInvoice: bodyExtraction, extractionSource: "body" as const};
      }

      // Body had no invoice data — try attachments in order.
      for (const attachment of email.attachments) {
        const attachmentExtraction = await extractInvoiceFromAttachment(
          email.id,
          attachment,
          accessToken,
        );
        if (attachmentExtraction !== "No Payment Details") {
          return {
            ...email,
            extractedInvoice: attachmentExtraction,
            extractionSource: "attachment" as const,
            extractionAttachmentName: attachment.filename,
          };
        }
      }

      return {...email, extractedInvoice: null};
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : emails[i],
  );
}

/**
 * Uses an LLM to inspect an email body and extract structured invoice data.
 * Returns the populated ExtractedInvoice on success, or the sentinel string
 * "No Payment Details" when no relevant financial data is found.
 */
async function extractInvoiceFromEmailBody(
  body: string,
): Promise<ExtractedInvoice | "No Payment Details"> {
  if (!body.trim()) return "No Payment Details";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set — skipping email body extraction.");
    return "No Payment Details";
  }

  const client = new OpenAI({apiKey});

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {role: "system", content: EMAIL_BODY_EXTRACTION_PROMPT},
        // Trim to ~8 000 chars to stay well within the context budget.
        {role: "user", content: body.slice(0, 8000)},
      ],
      temperature: 0,
      response_format: {type: "json_object"},
    });

    const parsed = JSON.parse(
      response.choices[0].message.content?.trim() ?? "{}",
    ) as {found: boolean} & Partial<ExtractedInvoice>;

    if (!parsed.found) return "No Payment Details";

    const {found: _, ...invoice} = parsed;
    return invoice as ExtractedInvoice;
  } catch (err) {
    console.error("Email invoice extraction failed:", err);
    return "No Payment Details";
  }
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ATTACHMENT_SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/tiff",
  DOCX_MIME,
]);

/**
 * Downloads an attachment from Gmail and uses an LLM to assess whether it
 * contains invoice data. Returns the structured invoice on success, or
 * "No Payment Details" if nothing relevant is found or the type is unsupported.
 */
async function extractInvoiceFromAttachment(
  messageId: string,
  attachment: {attachmentId: string; filename: string; mimeType: string},
  accessToken: string,
): Promise<ExtractedInvoice | "No Payment Details"> {
  if (!ATTACHMENT_SUPPORTED_MIME_TYPES.has(attachment.mimeType)) {
    return "No Payment Details";
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set — skipping attachment extraction.");
    return "No Payment Details";
  }

  // Fetch the raw attachment bytes from Gmail.
  const attachmentRes = await fetch(
    `${GMAIL_API}/messages/${messageId}/attachments/${attachment.attachmentId}`,
    {headers: {Authorization: `Bearer ${accessToken}`}},
  );

  if (!attachmentRes.ok) {
    console.error(
      `Failed to fetch attachment ${attachment.filename}: ${attachmentRes.status}`,
    );
    return "No Payment Details";
  }

  const attachmentData = await attachmentRes.json();
  // Gmail returns base64url-encoded data.
  const base64 = (attachmentData.data as string)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const buffer = Buffer.from(base64, "base64");

  const client = new OpenAI({apiKey});

  try {
    let content: OpenAI.Chat.ChatCompletionContentPart[];

    if (attachment.mimeType === DOCX_MIME) {
      const { value: docText } = await mammoth.extractRawText({ buffer });
      content = [
        {
          type: "text",
          text: `${EMAIL_BODY_EXTRACTION_PROMPT}\n\nDocument text:\n${docText}`,
        },
      ];
    } else if (attachment.mimeType === "application/pdf") {
      const uploaded = await client.files.create({
        file: new File([buffer], attachment.filename, {
          type: "application/pdf",
        }),
        purpose: "assistants",
      });

      content = [
        {type: "text", text: EMAIL_BODY_EXTRACTION_PROMPT},
        {
          type: "file",
          file: {file_id: uploaded.id},
        } as OpenAI.Chat.ChatCompletionContentPart,
      ];
    } else {
      const b64 = buffer.toString("base64");
      content = [
        {type: "text", text: EMAIL_BODY_EXTRACTION_PROMPT},
        {
          type: "image_url",
          image_url: {
            url: `data:${attachment.mimeType};base64,${b64}`,
            detail: "high",
          },
        },
      ];
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{role: "user", content}],
      temperature: 0,
      response_format: {type: "json_object"},
    });

    const parsed = JSON.parse(
      response.choices[0].message.content?.trim() ?? "{}",
    ) as {found: boolean} & Partial<ExtractedInvoice>;

    if (!parsed.found) return "No Payment Details";

    const {found: _, ...invoice} = parsed;
    return invoice as ExtractedInvoice;
  } catch (err) {
    console.error(`Attachment invoice extraction failed (${attachment.filename}):`, err);
    return "No Payment Details";
  }
}

/**
 * Walks the MIME tree and returns the best available plain-text representation
 * of the email body. Prefers text/plain; falls back to stripped text/html.
 */
function decodeEmailBody(payload: MessagePart | undefined): string {
  if (!payload) return "";

  const plain = findBodyPart(payload, "text/plain");
  if (plain) return decodeBase64Url(plain);

  const html = findBodyPart(payload, "text/html");
  if (html) return stripHtml(decodeBase64Url(html));

  return "";
}

function findBodyPart(
  part: MessagePart,
  targetMimeType: string,
): string | null {
  if (part.mimeType === targetMimeType && part.body?.data) {
    return part.body.data;
  }
  for (const child of part.parts ?? []) {
    const found = findBodyPart(child, targetMimeType);
    if (found) return found;
  }
  return null;
}

function decodeBase64Url(encoded: string): string {
  // Gmail uses base64url (- and _ instead of + and /).
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Recursively walks the MIME tree and returns all parts that look like
 * invoice-relevant attachments (PDFs and common image types).
 */
function collectAttachments(
  part: MessagePart | undefined,
): {attachmentId: string; filename: string; mimeType: string}[] {
  if (!part) return [];

  const results: {attachmentId: string; filename: string; mimeType: string}[] =
    [];

  const ALLOWED_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/tiff",
    DOCX_MIME,
  ]);

  const filename = part.filename ?? "";
  const mimeType = part.mimeType ?? "";
  const attachmentId = part.body?.attachmentId;

  if (attachmentId && filename && ALLOWED_TYPES.has(mimeType)) {
    results.push({attachmentId, filename, mimeType});
  }

  for (const child of part.parts ?? []) {
    results.push(...collectAttachments(child));
  }

  return results;
}
