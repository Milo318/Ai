const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-70b-8192";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.SAFE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "SAFE_API_KEY missing on server" });
    return;
  }

  try {
    const { message, context } = req.body || {};
    if (!message) {
      res.status(400).json({ error: "Missing message" });
      return;
    }

    const prompt = [
      "Du bist ein professioneller Front-Lever-Coach.",
      "Antworte klar, motivierend und konkret.",
      "Gib priorisierte Schritte, Load-Management und kurze Technik-Cues.",
      context
        ? `Kontext: ${JSON.stringify(context)}`
        : "Kontext: keine Daten vorhanden.",
    ].join(" ");

    const groqResponse = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: message },
        ],
        temperature: 0.6,
      }),
    });

    const data = await groqResponse.json();
    if (!groqResponse.ok) {
      res.status(502).json({ error: "Upstream error", raw: data });
      return;
    }

    res.status(200).json({
      ok: true,
      reply: data.choices?.[0]?.message?.content || "",
      raw: data,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", detail: error.message });
  }
};
