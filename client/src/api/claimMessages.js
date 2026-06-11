import { apiFetch } from "./client.js";

export async function fetchClaimMessages(claimId) {
  const res = await apiFetch(
    `/claims/${encodeURIComponent(claimId)}/messages`
  );
  return Array.isArray(res?.messages) ? res.messages : [];
}

export async function sendClaimMessage(claimId, body) {
  const res = await apiFetch(
    `/claims/${encodeURIComponent(claimId)}/messages`,
    { method: "POST", body: { body } }
  );
  return res?.message ?? null;
}
