// @ts-nocheck
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         HF TOKEN ROTATOR — Dieu et Moi (Supabase)           ║
 * ║  Rotation automatique des tokens Hugging Face sur quota.    ║
 * ║  Codes déclencheurs : 402, 429, 503 (+ "quota" dans body)   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage :
 *   import { callHFWithRotation } from "../_shared/hfRotator.ts";
 *
 *   const result = await callHFWithRotation({
 *     model: "google/gemma-3-27b-it",
 *     messages: [...],
 *     temperature: 0.7,
 *     max_tokens: 1024,
 *   });
 */

// ─────────────────────────────────────────────
// 15 tokens HF avec ID unique
// ─────────────────────────────────────────────
export const HF_TOKENS: { id: string; key: string }[] = [
  { id: "HF_TOKEN_01", key: "" },
  { id: "HF_TOKEN_02", key: "" },
  { id: "HF_TOKEN_03", key: "" },
  { id: "HF_TOKEN_04", key: "" },
  { id: "HF_TOKEN_05", key: "" },
  { id: "HF_TOKEN_06", key: "" },
  { id: "HF_TOKEN_07", key: "" },
  { id: "HF_TOKEN_08", key: "" },
  { id: "HF_TOKEN_09", key: "" },
  { id: "HF_TOKEN_10", key: "" },
  { id: "HF_TOKEN_11", key: "" },
  { id: "HF_TOKEN_12", key: "" },
  { id: "HF_TOKEN_13", key: "" },
  { id: "HF_TOKEN_14", key: "" },
  { id: "HF_TOKEN_15", key: "" },
];

// ─────────────────────────────────────────────
// Codes HTTP indiquant un quota épuisé
// ─────────────────────────────────────────────
const QUOTA_STATUS_CODES = new Set([402, 429, 503]);

function isQuotaError(status: number, body: string): boolean {
  if (QUOTA_STATUS_CODES.has(status)) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("exceeded") ||
    lower.includes("credits") ||
    lower.includes("depleted") ||
    lower.includes("too many requests")
  );
}

// ─────────────────────────────────────────────
// Interface de paramètres HF Chat Completions
// ─────────────────────────────────────────────
export interface HFCallParams {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  /** Token de départ (index 0 par défaut). Utile pour tester un token spécifique. */
  startTokenIndex?: number;
}

export interface HFCallResult {
  /** La réponse JSON complète de HF */
  data: any;
  /** ID du token utilisé avec succès */
  usedTokenId: string;
  /** Index du token utilisé */
  usedTokenIndex: number;
}

// ─────────────────────────────────────────────
// Fonction principale de rotation
// ─────────────────────────────────────────────
export async function callHFWithRotation(params: HFCallParams): Promise<HFCallResult> {
  const { model, messages, temperature = 0.7, max_tokens = 1024, startTokenIndex = 0 } = params;

  const totalTokens = HF_TOKENS.length;
  let lastError: string = "";

  for (let i = 0; i < totalTokens; i++) {
    const idx = (startTokenIndex + i) % totalTokens;
    const token = HF_TOKENS[idx];

    console.log(`[HF Rotator] Tentative avec ${token.id} (index ${idx})...`);

    try {
      const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token.key}`,
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens }),
      });

      const responseBody = await response.text();

      if (response.ok) {
        console.log(`[HF Rotator] SUCCESS avec ${token.id}`);
        return {
          data: JSON.parse(responseBody),
          usedTokenId: token.id,
          usedTokenIndex: idx,
        };
      }

      if (isQuotaError(response.status, responseBody)) {
        console.warn(
          `[HF Rotator] Quota epuise sur ${token.id} (HTTP ${response.status}). Bascule sur token suivant...`
        );
        lastError = `${token.id}: HTTP ${response.status} — ${responseBody.substring(0, 200)}`;
        continue; // => token suivant
      }

      // Erreur non liée au quota => on la propage immédiatement
      throw new Error(
        `[HF Rotator] Erreur non-quota sur ${token.id} (HTTP ${response.status}): ${responseBody.substring(0, 300)}`
      );

    } catch (fetchErr: any) {
      // Erreur réseau ou erreur propagée
      if (fetchErr.message?.includes("[HF Rotator]")) throw fetchErr;
      console.warn(`[HF Rotator] Erreur reseau sur ${token.id}: ${fetchErr.message}`);
      lastError = fetchErr.message;
      continue;
    }
  }

  // Tous les tokens sont épuisés
  throw new Error(
    `[HF Rotator] TOUS LES ${totalTokens} TOKENS HF SONT EPUISES. Derniere erreur: ${lastError}`
  );
}
