// @ts-nocheck
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         HF TOKEN ROTATOR — Dieu et Moi (Supabase)           ║
 * ║  Rotation automatique des tokens Hugging Face sur quota.    ║
 * ║  Codes déclencheurs : 402, 429, 503 (+ "quota" dans body)   ║
 * ║  Bannissement temporaire de 1 mois pour erreurs 404 & quota. ║
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────
// Chargement dynamique des jetons depuis Deno.env
// ─────────────────────────────────────────────
export const getHFTokens = () => [
  { id: "HF_TOKEN_01", key: Deno.env.get("HF_TOKEN_01") || "" },
  { id: "HF_TOKEN_02", key: Deno.env.get("HF_TOKEN_02") || "" },
  { id: "HF_TOKEN_03", key: Deno.env.get("HF_TOKEN_03") || "" },
  { id: "HF_TOKEN_04", key: Deno.env.get("HF_TOKEN_04") || "" },
  { id: "HF_TOKEN_05", key: Deno.env.get("HF_TOKEN_05") || "" },
  { id: "HF_TOKEN_06", key: Deno.env.get("HF_TOKEN_06") || "" },
  { id: "HF_TOKEN_07", key: Deno.env.get("HF_TOKEN_07") || "" },
  { id: "HF_TOKEN_08", key: Deno.env.get("HF_TOKEN_08") || "" },
  { id: "HF_TOKEN_09", key: Deno.env.get("HF_TOKEN_09") || "" },
  { id: "HF_TOKEN_10", key: Deno.env.get("HF_TOKEN_10") || "" },
  { id: "HF_TOKEN_11", key: Deno.env.get("HF_TOKEN_11") || "" },
  { id: "HF_TOKEN_12", key: Deno.env.get("HF_TOKEN_12") || "" },
  { id: "HF_TOKEN_13", key: Deno.env.get("HF_TOKEN_13") || "" },
  { id: "HF_TOKEN_14", key: Deno.env.get("HF_TOKEN_14") || "" },
  { id: "HF_TOKEN_15", key: Deno.env.get("HF_TOKEN_15") || "" },
].filter(t => t.key !== "");

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
// Interface de paramètres HF Chat Completions & Embeddings
// ─────────────────────────────────────────────
export interface HFCallParams {
  model: string;
  messages?: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  /** Token de départ (index 0 par défaut). Utile pour tester un token spécifique. */
  startTokenIndex?: number;
  /** Type d'endpoint à appeler (chat par défaut, ou embed pour feature extraction) */
  endpointType?: "chat" | "embed";
  /** Texte d'entrée pour la génération d'embeddings */
  embeddingInput?: string;
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
// Fonction principale de rotation avec filtrage DB
// ─────────────────────────────────────────────
export async function callHFWithRotation(params: HFCallParams): Promise<HFCallResult> {
  const {
    model,
    messages,
    temperature = 0.7,
    max_tokens = 1024,
    startTokenIndex = 0,
    endpointType = "chat",
    embeddingInput
  } = params;

  const allTokens = getHFTokens();
  if (allTokens.length === 0) {
    throw new Error("[HF Rotator] Aucun jeton HF_TOKEN_XX n'est configure dans les variables d'environnement (Supabase Secrets).");
  }

  // Initialisation du client admin Supabase pour interagir avec la table de liste noire
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Récupération de la liste des jetons exclus temporairement
  const blockedTokenIds = new Set<string>();
  try {
    const { data: blacklist, error } = await supabaseAdmin
      .from("hf_token_blacklist")
      .select("token_id")
      .gt("blocked_until", new Date().toISOString());

    if (error) {
      console.error("[HF Rotator] Erreur lors de la lecture de la blacklist DB:", error);
    } else if (blacklist) {
      blacklist.forEach((item: any) => blockedTokenIds.add(item.token_id));
      console.log("[HF Rotator] Jetons blacklistes actuellement :", Array.from(blockedTokenIds));
    }
  } catch (dbErr) {
    console.error("[HF Rotator] Erreur de base de donnees pour la blacklist:", dbErr);
  }

  // 2. Filtrage des jetons disponibles
  const availableTokens = allTokens.filter(t => !blockedTokenIds.has(t.id));
  if (availableTokens.length === 0) {
    console.warn("[HF Rotator] Tous les jetons sont blacklistes. Tentative de secours avec la liste complete.");
  }

  const tokensToTry = availableTokens.length > 0 ? availableTokens : allTokens;
  const totalTokens = tokensToTry.length;
  let lastError: string = "";

  for (let i = 0; i < totalTokens; i++) {
    const idx = (startTokenIndex + i) % totalTokens;
    const token = tokensToTry[idx];

    console.log(`[HF Rotator] Tentative avec ${token.id} (index ${idx}) [Type: ${endpointType}]...`);

    let fetchUrl = "https://router.huggingface.co/v1/chat/completions";
    let requestBody = "";

    if (endpointType === "embed") {
      fetchUrl = `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`;
      requestBody = JSON.stringify({ inputs: embeddingInput, options: { wait_for_model: true } });
    } else {
      requestBody = JSON.stringify({ model, messages, temperature, max_tokens });
    }

    try {
      const response = await fetch(fetchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token.key}`,
        },
        body: requestBody,
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

      const is404 = response.status === 404;
      const isQuota = isQuotaError(response.status, responseBody);

      if (is404 || isQuota) {
        const errorType = is404 ? "HTTP 404" : `Quota (HTTP ${response.status})`;
        console.warn(
          `[HF Rotator] Erreur ${errorType} sur ${token.id}. Bannissement temporaire de 1 mois...`
        );

        // Date d'expiration du bannissement : NOW + 1 mois
        const blockedUntil = new Date();
        blockedUntil.setMonth(blockedUntil.getMonth() + 1);

        try {
          await supabaseAdmin
            .from("hf_token_blacklist")
            .upsert({
              token_id: token.id,
              blocked_until: blockedUntil.toISOString(),
              last_error: `Type: ${errorType} | Body: ${responseBody.substring(0, 200)}`,
              updated_at: new Date().toISOString()
            }, { onConflict: "token_id" });
        } catch (dbErr) {
          console.error(`[HF Rotator] Impossible d'enregistrer le blocage de ${token.id} dans la DB:`, dbErr);
        }

        lastError = `${token.id}: ${errorType} — ${responseBody.substring(0, 200)}`;
        continue; // => Essai avec le jeton suivant
      }

      // Autre erreur HTTP => On la propage
      throw new Error(
        `[HF Rotator] Erreur non-quota sur ${token.id} (HTTP ${response.status}): ${responseBody.substring(0, 300)}`
      );

    } catch (fetchErr: any) {
      if (fetchErr.message?.includes("[HF Rotator]")) throw fetchErr;
      console.warn(`[HF Rotator] Erreur reseau ou requete sur ${token.id}: ${fetchErr.message}`);
      lastError = fetchErr.message;
      continue;
    }
  }

  throw new Error(
    `[HF Rotator] ECHEC GLOBAL. Les ${totalTokens} jetons essayes ont echoue. Derniere erreur: ${lastError}`
  );
}

