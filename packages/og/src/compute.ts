import {
  TeaserGenerationRequestSchema,
  TeaserGenerationResponseSchema,
  type TeaserGenerationRequest,
  type TeaserGenerationResponse
} from "@story/shared";

export type ZeroGComputeClientConfig = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  mock?: boolean;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export class ZeroGComputeClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly mock: boolean;

  constructor(config: ZeroGComputeClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.OG_COMPUTE_BASE_URL ?? "";
    this.apiKey = config.apiKey ?? process.env.OG_COMPUTE_API_KEY ?? "";
    this.model = config.model ?? process.env.OG_COMPUTE_MODEL ?? "";
    this.timeoutMs = config.timeoutMs ?? 45_000;
    this.mock = config.mock ?? process.env.OG_COMPUTE_MOCK === "true";

    if (!this.mock && (!this.baseUrl || !this.apiKey || !this.model)) {
      throw new Error(
        "Missing 0G Compute config. Set OG_COMPUTE_BASE_URL, OG_COMPUTE_API_KEY, and OG_COMPUTE_MODEL, or use OG_COMPUTE_MOCK=true."
      );
    }
  }

  async generateTeasers(
    request: TeaserGenerationRequest
  ): Promise<TeaserGenerationResponse> {
    const parsedRequest = TeaserGenerationRequestSchema.parse(request);

    if (this.mock) {
      return mockTeaserGeneration(parsedRequest);
    }

    const response = await this.chatCompletions({
      messages: [
        {
          role: "system",
          content: [
            "You are an author-rights-preserving content promotion agent.",
            "Your job is to adapt a small excerpt into high-quality teasers.",
            "Respect the rights policy and never expose more content than allowed.",
            "Return only valid JSON matching this shape:",
            JSON.stringify({
              candidates: [
                {
                  id: "candidate-1",
                  teaserText: "string",
                  continuationPreview: "string",
                  socialCaption: "string",
                  suggestedHashtags: ["string"],
                  riskScore: 0.1,
                  rationale: "string"
                }
              ],
              recommendedCandidateId: "candidate-1",
              policyNotes: ["string"],
              requiresAuthorApproval: true
            })
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Generate paid-short-story teaser candidates.",
            request: parsedRequest
          })
        }
      ],
      temperature: 0.7
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("0G Compute returned no message content.");
    }

    const json = extractJson(content);
    return TeaserGenerationResponseSchema.parse(json);
  }

  private async chatCompletions(input: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
  }): Promise<ChatCompletionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.chatCompletionsUrl(), {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: input.messages,
          temperature: input.temperature ?? 0.7,
          response_format: { type: "json_object" }
        })
      });

      const text = await res.text();
      const json = text ? safeJsonParse(text) : null;

      if (!res.ok) {
        throw new Error(
          `0G Compute failed with HTTP ${res.status}: ${JSON.stringify(json)}`
        );
      }

      return json as ChatCompletionResponse;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`0G Compute timed out after ${this.timeoutMs}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private chatCompletionsUrl(): string {
    const base = this.baseUrl.replace(/\/$/, "");

    if (base.endsWith("/chat/completions")) {
      return base;
    }

    if (base.endsWith("/v1/proxy")) {
      return `${base}/chat/completions`;
    }

    if (base.endsWith("/v1")) {
      return `${base}/chat/completions`;
    }

    return `${base}/v1/proxy/chat/completions`;
  }
}

export async function generateTeasersWith0G(
  request: TeaserGenerationRequest,
  config?: ZeroGComputeClientConfig
): Promise<TeaserGenerationResponse> {
  const client = new ZeroGComputeClient(config);
  return client.generateTeasers(request);
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("Could not extract JSON from 0G Compute response.");
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function mockTeaserGeneration(
  request: TeaserGenerationRequest
): TeaserGenerationResponse {
  const title = request.title;
  const excerpt = request.manuscriptExcerpt.slice(
    0,
    Math.min(220, request.agentPolicy.rights.maxExcerptChars)
  );

  const candidates = [
    {
      id: "candidate-1",
      teaserText: `${excerpt.trim()}...`,
      continuationPreview:
        "Unlock the next fragment to discover what the narrator finds behind the closed door.",
      socialCaption: `A hidden fragment from “${title}”. Read the beginning free, then unlock the continuation for a tiny payment.`,
      suggestedHashtags: ["#indieauthors", "#shortfiction", "#web3stories"],
      riskScore: 0.12,
      rationale:
        "Uses a short excerpt, preserves attribution, and avoids over-revealing the full work."
    },
    {
      id: "candidate-2",
      teaserText: `Before everything changed, one line from “${title}” refused to stay buried: ${excerpt.trim()}...`,
      continuationPreview:
        "The continuation reveals the first concrete consequence of that secret.",
      socialCaption: `A cinematic teaser from “${title}” — pay only if the hook gets you.`,
      suggestedHashtags: ["#bookteaser", "#fiction", "#creator economy"],
      riskScore: 0.2,
      rationale:
        "More promotional framing, still within excerpt and rights constraints."
    },
    {
      id: "candidate-3",
      teaserText: `What would you do if this appeared in your hands?\n\n${excerpt.trim()}...`,
      continuationPreview:
        "The paid continuation reveals why the object matters and who is watching.",
      socialCaption: `A micro-story doorway into “${title}”. Free teaser, paid continuation, full author attribution.`,
      suggestedHashtags: ["#microfiction", "#storytelling", "#onchain"],
      riskScore: 0.18,
      rationale:
        "Interactive hook format for social engagement with conservative content exposure."
    }
  ].slice(0, request.numberOfCandidates);

  return {
    candidates,
    recommendedCandidateId: candidates[0].id,
    policyNotes: [
      "Mock mode active; replace with 0G Compute provider once credentials are available.",
      "Author approval is required before publishing."
    ],
    requiresAuthorApproval: true
  };
}

