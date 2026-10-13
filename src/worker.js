import { EmailMessage } from "cloudflare:email";

/**
 * Builds an RFC 5322 MIME message string for email transmission.
 */
function buildMimeMessage({ from, to, replyTo, subject, textContent }) {
  const dateStr = new Date().toUTCString();
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const headers = [
    `From: Connectware Solution <${from}>`,
    `To: <${to}>`,
    `Reply-To: <${replyTo}>`,
    `Subject: ${encodedSubject}`,
    `Date: ${dateStr}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`
  ];

  return `${headers.join("\r\n")}\r\n\r\n${textContent}`;
}

/**
 * Core handler for processing contact form submissions.
 */
export async function handleContactRequest(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    let name = "";
    let company = "";
    let email = "";
    let phone = "";
    let service = "";
    let message = "";
    let honeypot = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await request.json();
      name = (data.name || "").trim();
      company = (data.company || "").trim();
      email = (data.email || "").trim();
      phone = (data.phone || "").trim();
      service = (data.Service || data.service || "").trim();
      message = (data.message || "").trim();
      honeypot = (data._gotcha || data.website_hp || "").trim();
    } else {
      const formData = await request.formData();
      name = (formData.get("name") || "").toString().trim();
      company = (formData.get("company") || "").toString().trim();
      email = (formData.get("email") || "").toString().trim();
      phone = (formData.get("phone") || "").toString().trim();
      service = (formData.get("Service") || formData.get("service") || "").toString().trim();
      message = (formData.get("message") || "").toString().trim();
      honeypot = (formData.get("_gotcha") || formData.get("website_hp") || "").toString().trim();
    }

    // Honeypot check: silently accept if spam bot filled out the hidden field
    if (honeypot) {
      return new Response("OK", { status: 200 });
    }

    // Required fields validation
    if (!name || !email || !message) {
      return new Response("Please fill out all required fields (Name, Email, Message).", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response("Invalid email address format.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const emailBody = [
      "New Contact Inquiry received via connectware.in:",
      "==================================================",
      `Name:     ${name}`,
      `Company:  ${company || "Not specified"}`,
      `Email:    ${email}`,
      `Phone:    ${phone || "Not specified"}`,
      `Service:  ${service || "General Inquiry"}`,
      "",
      "Message:",
      message,
      "==================================================",
      `Submitted: ${new Date().toISOString()}`,
      `Client IP: ${request.headers.get("cf-connecting-ip") || "Unknown"}`,
      `Country:   ${request.headers.get("cf-ipcountry") || "Unknown"}`
    ].join("\n");

    const toAddress = "contactus@connectware.in";
    const fromAddress = "contactus@connectware.in";
    const subject = `New Contact Inquiry: ${name} (${service || "Connectware"})`;

    // Deliver email via Cloudflare Native Email Routing (send_email binding)
    if (env && env.EMAIL && typeof env.EMAIL.send === "function") {
      const mime = buildMimeMessage({
        from: fromAddress,
        to: toAddress,
        replyTo: email,
        subject: subject,
        textContent: emailBody
      });

      const emailMsg = new EmailMessage(fromAddress, toAddress, mime);
      await env.EMAIL.send(emailMsg);
    } else {
      console.warn("Cloudflare Email Routing binding (env.EMAIL) is not configured in this environment.");
    }

    // Return "OK" to trigger success state in template validate.js
    return new Response("OK", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error("Error processing contact submission:", error);
    return new Response("An error occurred while submitting your message. Please try again.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle contact form endpoints
    if (
      (url.pathname === "/api/contact" ||
       url.pathname === "/forms/contact.php" ||
       url.pathname === "/forms/contact") &&
      request.method === "POST"
    ) {
      return handleContactRequest(request, env);
    }

    // Serve all static assets
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
