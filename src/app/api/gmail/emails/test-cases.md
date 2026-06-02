1. Authentication Tests
   AUTH-001: Missing Gmail Token
   Setup
   Request contains no Gmail OAuth cookie.
   Expected Response

Status: 401

{
"error": "Not connected to Gmail."
}
Assertions
Gmail API never called.
OpenAI API never called.
Response contains error field only.
AUTH-002: Empty Token Cookie
Setup
Cookie exists but value is empty string.
Expected Response

Status: 401

{
"error": "Not connected to Gmail."
}
Assertions
No downstream API calls.
AUTH-003: Invalid OAuth Token
Setup
Cookie contains invalid token.
Gmail API returns 401.
Expected Response

Depends on implementation:

Either propagated Gmail error (likely 401/500)
Or generic server error
Assertions
Verify endpoint does not return emails.
Verify failure path logged.
AUTH-004: Expired Token Successfully Refreshed
Setup
Token refresh logic triggered.
New access token issued.
Expected Response

Status: 200

{
"emails": [...]
}
Assertions
Set-Cookie header exists.
Gmail API called using refreshed token.
Response data returned normally.
AUTH-005: Token Refresh Fails
Setup
Refresh token invalid.
Refresh operation fails.
Expected Response

Authentication failure.

Assertions
No Gmail message fetches occur.
Appropriate error response returned. 2. Gmail Search / Candidate Fetching
GMAIL-001: Gmail Search Returns No Messages
Setup

Search endpoint returns:

{
"messages": []
}
Expected Response

Status: 200

{
"emails": []
}
Assertions
No individual message fetches.
No OpenAI calls.
GMAIL-002: Gmail Search Returns Null Messages
Setup
{}

or

{
"messages": null
}
Expected Response

Status: 200

{
"emails": []
}
Assertions
Defensive handling of missing messages array.
GMAIL-003: Search Returns More Than 50 Matches
Setup
Gmail search has 100 matches.
Expected Response

Only first 50 processed.

Assertions
Exactly 50 message fetch requests issued.
GMAIL-004: Gmail Search API Failure
Setup
Gmail search endpoint returns 500.
Expected Response

Server error.

Assertions
No message fetches attempted.
No OpenAI calls. 3. Promise.allSettled / Partial Message Fetch Failures
FETCH-001: One Message Fetch Fails
Setup

Search returns:

msg1
msg2
msg3

msg2 fetch fails.

Expected Response
{
"emails": [
{...msg1},
{...msg3}
]
}
Assertions
Failed message omitted.
Request still succeeds.
FETCH-002: Half of Message Fetches Fail
Setup

50 stubs returned.

25 succeed.

25 fail.

Expected Response

Only successful messages returned.

Assertions
Endpoint status remains 200.
No batch-wide failure.
FETCH-003: All Message Fetches Fail
Setup

All full-message fetches reject.

Expected Response
{
"emails": []
}
Assertions
Endpoint still returns success.
No extraction attempts. 4. Filtering Logic
FILTER-001: Subject Contains "Invoice"
Setup

Subject:

Invoice #12345

No attachments.

Expected Response

Included.

Assertions
"detectionReason": "subject_keyword"
FILTER-002: Subject Contains Mixed Case Keyword
Setup
Re: PAYMENT DUE
Expected Response

Included.

Assertions
Case-insensitive matching.
FILTER-003: Subject Contains "Statement"
Setup
Monthly Statement
Expected Response

Included.

FILTER-004: Subject Contains "Purchase Order"
Setup
Purchase Order PO-100
Expected Response

Included.

FILTER-005: PDF Attachment Only
Setup

Subject:

Hello

Attachment:

{
"mimeType": "application/pdf"
}
Expected Response

Included.

Assertions
"detectionReason": "pdf_attachment"
FILTER-006: PNG Attachment Only
Setup
{
"mimeType": "image/png"
}
Expected Response

Included.

FILTER-007: JPEG Attachment Only
Setup
{
"mimeType": "image/jpeg"
}
Expected Response

Included.

FILTER-008: WEBP Attachment Only
Setup
{
"mimeType": "image/webp"
}
Expected Response

Included.

FILTER-009: TIFF Attachment Only
Setup
{
"mimeType": "image/tiff"
}
Expected Response

Included.

FILTER-010: Subject Match + Attachment
Setup

Subject:

Invoice #999

Attachment:

PDF.

Expected Response

Included.

Assertions
"detectionReason": "both"
FILTER-011: No Matching Subject, Unsupported Attachment
Setup

Subject:

Meeting Notes

Attachment:

{
"mimeType": "application/zip"
}
Expected Response

Excluded.

FILTER-012: Neither Subject Nor Attachment Match
Setup

Subject:

Team Lunch

No attachments.

Expected Response

Excluded.

5. Body Decoding
   BODY-001: text/plain Present
   Setup

MIME tree contains:

text/plain
text/html
Expected Response

Plain text selected.

Assertions
HTML ignored.
BODY-002: HTML Only
Setup

Only:

<html><body><h1>Invoice</h1></body></html>
Expected Response

Body:

Invoice
Assertions
Tags stripped.
BODY-003: Nested MIME Plain Text
Setup

Multipart tree with nested text/plain.

Expected Response

Correct plain text extracted.

BODY-004: Empty Body
Setup

No body content.

Expected Response
"body": ""
Assertions
Extraction still attempted with empty string.
BODY-005: Base64URL Decoding
Setup

Gmail encoded body:

SGVsbG8td29ybGQ\_
Expected Response

Correct decoded text.

BODY-006: Body > 8,000 Characters
Setup

10,000-character body.

Expected Response

Only first 8,000 chars sent to OpenAI.

Assertions
OpenAI payload length <= 8000. 6. Invoice Extraction — Body Stage
EXTRACT-BODY-001: Invoice Found
Setup

GPT response:

{
"found": true,
"invoice_number": "INV-001"
}
Expected Response
"extractedInvoice": {
"invoice_number": "INV-001"
}
Assertions
No attachment processing.
EXTRACT-BODY-002: Found False
Setup
{
"found": false
}
Expected Response

Attachment fallback starts.

Assertions
Attachments examined.
EXTRACT-BODY-003: Partial Invoice
Setup

GPT returns only:

{
"found": true,
"vendor": {
"name": "Acme"
}
}
Expected Response

Accepted.

Assertions
Missing fields allowed.
EXTRACT-BODY-004: Invalid JSON From OpenAI
Setup

Malformed response.

Expected Response

Graceful handling.

Assertions
Email still returned.
extractedInvoice becomes null. 7. Attachment Fallback — PDFs
ATTACH-PDF-001: Body Fails, PDF Succeeds
Setup

Body:

{ "found": false }

PDF extraction:

{ "found": true }
Expected Response

Invoice extracted.

Assertions
Files API called.
Chat completion references uploaded file.
ATTACH-PDF-002: Multiple PDFs, First Succeeds
Setup

PDF1 -> found true

PDF2 -> never evaluated

Assertions
Loop exits immediately.
ATTACH-PDF-003: First PDF Fails, Second Succeeds
Assertions
Both processed.
Second result used.
ATTACH-PDF-004: PDF Upload Failure
Setup

files.create() throws.

Assertions
Next attachment attempted.
Endpoint survives. 8. Attachment Fallback — Images
ATTACH-IMG-001: PNG Invoice
Setup

Body false.

PNG extraction returns found true.

Assertions
Image passed as base64 data URI.
ATTACH-IMG-002: JPEG Invoice
Expected Response

Invoice extracted.

ATTACH-IMG-003: WEBP Invoice
Expected Response

Invoice extracted.

ATTACH-IMG-004: TIFF Invoice
Expected Response

Invoice extracted.

9. Multiple Attachment Behavior
   ATTACH-MULTI-001: Unsupported Then PDF
   Setup
   ZIP
   PDF
   Assertions
   ZIP skipped silently.
   PDF processed.
   ATTACH-MULTI-002: Image Then PDF
   Setup

Image returns found true.

Assertions
PDF never processed.
ATTACH-MULTI-003: All Attachments Return Found False
Expected Response
"extractedInvoice": null
ATTACH-MULTI-004: No Attachments
Setup

Body extraction false.

Expected Response
"extractedInvoice": null 10. Attachment Download Failures
ATTACH-DL-001: Attachment API Returns 404
Assertions
Attachment skipped.
Remaining attachments continue.
ATTACH-DL-002: Attachment API Timeout
Assertions
Email processing continues.
ATTACH-DL-003: Corrupted Attachment Data
Assertions
Extraction fails gracefully.
No endpoint crash. 11. OpenAI Failures
AI-001: Missing OPENAI_API_KEY
Setup

Environment variable absent.

Expected Response

Server error.

Assertions
Extraction cannot proceed.
AI-002: Chat Completion Timeout
Assertions
Email still returned.
extractedInvoice null.
AI-003: OpenAI 429
Assertions
Graceful degradation.
Request completes.
AI-004: OpenAI 500
Assertions
Email remains in response.
Extraction null. 12. Response Contract Validation
RESP-001: Returned Email Shape
Assertions

Every email contains:

{
"id": "string",
"subject": "string",
"from": "string",
"date": "string",
"snippet": "string",
"hasAttachment": true,
"attachments": [],
"detectionReason": "subject_keyword",
"body": "string",
"extractedInvoice": null
}
RESP-002: Attachment Shape
Assertions
{
"attachmentId": "string",
"filename": "string",
"mimeType": "string"
}
RESP-003: Invoice Shape
Assertions

Fields may exist with null values:

{
"invoice_number": null,
"invoice_date": null,
"due_date": null,
"vendor": {
"name": null
}
} 13. Malformed Gmail Responses
MALFORM-001: Missing Payload
Setup
{
"id": "123"
}
Assertions
Email skipped or safely handled.
MALFORM-002: Missing Headers
Setup

No Subject header.

Assertions
Subject defaults safely.
No crash.
MALFORM-003: Invalid MIME Tree
Setup

Unexpected MIME structure.

Assertions
Body extraction falls back safely.
MALFORM-004: Missing Attachment Metadata
Setup

Attachment part lacks filename/mimeType.

Assertions
No crash.
Attachment ignored if unsupported. 14. End-to-End Happy Paths
E2E-001: Invoice Found In Body
Flow
Auth succeeds.
Gmail search returns invoice email.
Filter passes by subject.
Body decoded.
GPT returns invoice.
Assertions
200 response.
Correct detectionReason.
Attachment APIs never called.
E2E-002: Invoice Found In PDF Attachment
Flow
Subject doesn't contain keyword.
PDF attachment causes inclusion.
Body extraction returns false.
PDF extraction returns true.
Assertions
detectionReason = pdf_attachment
Files API called.
Invoice returned.
E2E-003: Invoice Found In Second Attachment
Flow
Body false.
Attachment 1 false.
Attachment 2 true.
Assertions
Attachment processing stops after second.
Third attachment never processed.
E2E-004: Mixed Batch
Setup

50 candidates:

10 filtered out
5 fetch failures
20 body invoices
10 attachment invoices
5 no invoice data
Assertions
Correct counts.
Successful emails returned.
Partial failures do not affect others.
Recommended Automated Coverage Priority

If implementing Jest integration tests, prioritize:

P0 (must-have)
AUTH-001
GMAIL-001
FETCH-001
FILTER-001
FILTER-005
FILTER-010
BODY-001
BODY-002
EXTRACT-BODY-001
EXTRACT-BODY-002
ATTACH-PDF-001
ATTACH-MULTI-001
RESP-001
E2E-001
E2E-002
P1
Partial Gmail failures
OpenAI failures
Missing OPENAI_API_KEY
Large-body truncation
Multi-attachment stopping logic
P2
Malformed Gmail payloads
Corrupted attachments
Edge MIME structures
Rare attachment MIME types (WEBP/TIFF)

This set gives you near-complete coverage of the endpoint's authentication, Gmail integration, filtering, MIME decoding, extraction pipeline, fallback logic, resilience, and response-contract guarantees.
