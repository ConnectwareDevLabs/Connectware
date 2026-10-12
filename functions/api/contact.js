import { handleContactRequest } from "../../src/worker.js";

export async function onRequestPost(context) {
  return handleContactRequest(context.request, context.env);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
