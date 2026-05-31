const MASTERY_API_URL =
  import.meta.env.VITE_MASTERY_API_URL || "http://localhost:8000";

export async function fetchTargets(tiers = ["none", "bronze"], limit = 15) {
  try {
    const qs = new URLSearchParams({
      tiers: tiers.join(","),
      limit: String(limit),
    });
    const r = await fetch(`${MASTERY_API_URL}/mastery/targets?${qs}`);
    if (!r.ok) return [];
    return (await r.json()).words || [];
  } catch {
    return [];
  }
}

export async function reportDrillCorrect(word) {
  try {
    await fetch(`${MASTERY_API_URL}/mastery/patch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: String(word).toLowerCase().trim(),
        source: "drill",
        delta: { correct_count: 1 },
      }),
    });
  } catch {
    /* fire-and-forget: ignora falha */
  }
}
