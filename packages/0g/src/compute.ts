// packages/og/src/compute.ts
export async function generateTeasersWith0G(input: {
  title: string;
  excerpt: string;
  policy: unknown;
}) {
  const res = await fetch(`${process.env.OG_COMPUTE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OG_COMPUTE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OG_COMPUTE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an author-rights-preserving content promotion agent. Return JSON only."
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Generate 3 short teaser candidates and one social caption.",
            ...input
          })
        }
      ],
      temperature: 0.7
    })
  });

  if (!res.ok) {
    throw new Error(`0G Compute failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

