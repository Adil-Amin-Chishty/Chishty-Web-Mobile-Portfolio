# Chishty Productions — Vercel website

Public URL: https://chishty-productions.vercel.app

The project and discovery-call forms now submit to `/api/enquiry`. When Gmail sending is configured, the server sends the enquiry to chishtyproduction001@gmail.com, sets Reply-To to the visitor, and sends the visitor a branded acknowledgement: “We’ve received your enquiry. We’ll contact you shortly.” Proposed calls remain subject to availability confirmation.

The Gmail App Password belongs only in the Vercel project's encrypted `GMAIL_APP_PASSWORD` Production environment variable. Never put it in frontend code, this folder, Git, or chat. After adding it, deploy again so the server receives the new setting. Gmail requires 2-Step Verification before creating an App Password.

Until Gmail is connected, opening either form automatically shows a primary email-draft action and explains that the visitor must send the draft from their email app. The direct-send button appears when Gmail is configured. It never claims an enquiry was received when the server could not send it. If the owner email succeeds but the acknowledgement fails, it confirms receipt without claiming that a confirmation email was sent.

The inbox is the current enquiry record; no Systeme.io CRM or automatic Calendar appointment is configured. Mail requests have server-side validation, origin checks, signed short-lived form tokens, a honeypot, and per-instance throttling/duplicate checks. Those in-memory limits are not a distributed CRM or queue.

Verified with mocked email transport: owner/visitor routing, acknowledgement copy, invalid input, duplicate request, origin rejection, setup errors, provider failures, partial acknowledgement failure and proposed-call wording. Browser checks cover successful enquiry/call flows and fallback behavior without opening the visitor's email app.
