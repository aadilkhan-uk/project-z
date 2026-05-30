import OpenAI from "openai";
import {NextRequest, NextResponse} from "next/server";

const SUPPORTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/gif": "gif",
  "image/webp": "webp",
};

const EXTRACTION_PROMPT = `You are an invoice data extraction assistant.

Extract ALL of the following fields from the invoice (use null if a field is not present):

{
  "invoice_number": "<string>",
  "invoice_date": "<YYYY-MM-DD>",
  "due_date": "<YYYY-MM-DD>",
  "vendor": {
    "name": "<string>",
    "address": "<string>",
    "email": "<string>",
    "phone": "<string>",
    "tax_id": "<string>"
  },
  "bill_to": {
    "name": "<string>",
    "address": "<string>",
    "email": "<string>"
  },
  "line_items": [
    {
      "description": "<string>",
      "quantity": <number>,
      "unit_price": <number>,
      "total": <number>
    }
  ],
  "subtotal": <number>,
  "tax_rate": <number>,
  "tax_amount": <number>,
  "discount": <number>,
  "total_amount": <number>,
  "currency": "<ISO 4217 code>",
  "payment_terms": "<string>",
  "notes": "<string>"
}

Return ONLY the JSON object — no extra fields or commentary.`.trim();

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {error: "OPENAI_API_KEY is not configured."},
      {status: 500},
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {error: "Request must be multipart/form-data."},
      {status: 400},
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      {error: "Missing 'file' file field."},
      {status: 400},
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!SUPPORTED_TYPES[mimeType]) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${mimeType}. Use PDF, PNG, JPG, GIF, or WEBP.`,
      },
      {status: 415},
    );
  }

  // Mock response (uncomment to use instead of OpenAI extraction):
  // return NextResponse.json({
  //   invoice_number: "INV-2024-00421",
  //   invoice_date: "2024-11-15",
  //   due_date: "2024-12-15",
  //   vendor: {
  //     name: "Acme Supplies Ltd.",
  //     address: "123 Commerce Street, London, EC1A 1BB, UK",
  //     email: "billing@acmesupplies.co.uk",
  //     phone: "+44 20 7946 0958",
  //     tax_id: "GB123456789",
  //   },
  //   bill_to: {
  //     name: "Project Z Inc.",
  //     address: "456 Innovation Ave, San Francisco, CA 94107, USA",
  //     email: "accounts@projectz.io",
  //   },
  //   line_items: [
  //     { description: "Cloud Infrastructure Services (Nov 2024)", quantity: 1, unit_price: 3200.0, total: 3200.0 },
  //     { description: "Software Licenses (x10 seats)", quantity: 10, unit_price: 49.99, total: 499.9 },
  //     { description: "Professional Support Hours", quantity: 8, unit_price: 175.0, total: 1400.0 },
  //   ],
  //   subtotal: 5099.9,
  //   tax_rate: 20.0,
  //   tax_amount: 1019.98,
  //   discount: 0,
  //   total_amount: 6119.88,
  //   currency: "GBP",
  //   payment_terms: "Net 30",
  //   notes: "Please reference invoice number INV-2024-00421 when making payment.",
  // });

  const client = new OpenAI({apiKey});
  const model = (formData.get("model") as string) || "gpt-4o";

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let content: OpenAI.Chat.ChatCompletionContentPart[];

    if (mimeType === "application/pdf") {
      const uploaded = await client.files.create({
        file: new File([buffer], file.name, {type: mimeType}),
        purpose: "assistants",
      });

      content = [
        {type: "text", text: EXTRACTION_PROMPT},
        {
          type: "file",
          file: {file_id: uploaded.id},
        } as OpenAI.Chat.ChatCompletionContentPart,
      ];
    } else {
      const b64 = buffer.toString("base64");
      content = [
        {type: "text", text: EXTRACTION_PROMPT},
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${b64}`,
            detail: "high",
          },
        },
      ];
    }

    const response = await client.chat.completions.create({
      model,
      messages: [{role: "user", content}],
      temperature: 0,
      response_format: {type: "json_object"},
    });

    const raw = response.choices[0].message.content?.trim() ?? "{}";
    const extracted = JSON.parse(raw);

    return NextResponse.json(extracted);
  } catch (error) {
    console.error("Invoice extraction error:", error);
    return NextResponse.json(
      {error: "Failed to extract invoice data."},
      {status: 500},
    );
  }
}
