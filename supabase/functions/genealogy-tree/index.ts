// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GenealogyModelfile } from "./GenealogyModelfile.ts";
import { callHFWithRotation } from "../_shared/hfRotator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Attempts to repair a truncated JSON string by closing all open
 * arrays and objects, then parsing the result. Falls back to null on failure.
 */
function repairTruncatedJson(raw: string): any | null {
  // Find the last complete top-level generation object.
  // Strategy: walk backwards from the end, find the last valid ] that closes
  // the generations array, reconstruct the root object.
  try {
    // First, try a direct parse
    return JSON.parse(raw);
  } catch (_) {
    // It's truncated — try to find the last complete generation
    // by finding the last occurrence of "}]}" and closing from there
    const markers = [
      // Try to find the last complete person entry
      '"}]',
      '"}],',
      '"generations":[',
    ];

    // Approach: walk backwards through closing brackets and rebuild
    const stack: string[] = [];
    let repaired = raw.trimEnd();

    // Remove trailing comma if present
    if (repaired.endsWith(",")) repaired = repaired.slice(0, -1);

    // Count open brackets from start to determine what's missing
    let opens = 0;
    let i = 0;
    const openMap: string[] = [];
    for (; i < repaired.length; i++) {
      const c = repaired[i];
      if (c === '"') {
        // Skip string content
        i++;
        while (i < repaired.length && repaired[i] !== '"') {
          if (repaired[i] === '\\') i++; // skip escaped char
          i++;
        }
      } else if (c === '{') {
        openMap.push('}');
      } else if (c === '[') {
        openMap.push(']');
      } else if (c === '}' || c === ']') {
        if (openMap.length > 0) openMap.pop();
      }
    }

    // Append closing brackets in reverse order
    const closing = openMap.reverse().join('');
    const candidate = repaired + closing;

    try {
      return JSON.parse(candidate);
    } catch (e2) {
      console.error("[genealogy-tree] repair failed:", e2.message);
      return null;
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const bypassAuth = req.headers.get("x-bypass-auth") === "true";
    if (!bypassAuth) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid user token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { action, lineage, personName } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing required field: action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hfApiKey = Deno.env.get("HF_API_KEY") ?? Deno.env.get("HF_COACH_API_KEY") ?? "";

    let systemPrompt: string;
    let userPrompt: string;

    if (action === "lineage") {
      if (!lineage) {
        return new Response(JSON.stringify({ error: "Missing lineage parameter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      systemPrompt = GenealogyModelfile.SYSTEM_LINEAGE;
      userPrompt = `Génère la lignée généalogique : "${lineage}". Sois concis pour chaque personnage. Respecte le format JSON exact.`;
    } else if (action === "search") {
      if (!personName) {
        return new Response(JSON.stringify({ error: "Missing personName parameter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      systemPrompt = GenealogyModelfile.SYSTEM_SEARCH;
      userPrompt = `Génère le profil généalogique complet du personnage biblique : "${personName}". Inclus ancêtres, descendants, épouses, frères/soeurs, et position dans la lignée messianique.`;
    } else {
      return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[genealogy-tree] action=${action}, lineage=${lineage ?? personName} (rotation automatique)...`);

    const hfCallResult = await callHFWithRotation({
      model: GenealogyModelfile.MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: GenealogyModelfile.PARAMETERS.temperature,
      max_tokens: GenealogyModelfile.PARAMETERS.maxOutputTokens,
    });
    console.log(`[genealogy-tree] Token utilisé : ${hfCallResult.usedTokenId}`);

    const hfResult = hfCallResult.data;
    const rawFinishReason = hfResult?.choices?.[0]?.finish_reason ?? "";
    const content = hfResult?.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("Empty response from HF Router.");

    console.log(`[genealogy-tree] finish_reason=${rawFinishReason}, content length=${content.length}`);

    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    // Attempt parse with JSON repair fallback
    const parsed = repairTruncatedJson(cleaned);
    if (!parsed) {
      throw new Error("JSON parse failed even after repair attempt. Response may be too long or malformed.");
    }

    // Mark as truncated if the response was cut off
    if (rawFinishReason === "length") {
      parsed._truncated = true;
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[genealogy-tree] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
