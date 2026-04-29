import { z } from "zod";

export const HexAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected an EVM address");

export const Bytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Expected a bytes32 hex string");

export const UriSchema = z.string().min(1, "URI cannot be empty");

export const SocialPlatformSchema = z.enum([
  "social_sandbox",
  "instagram",
  "tiktok",
  "x",
  "farcaster"
]);

export const CampaignStatusSchema = z.enum([
  "draft",
  "agent_planned",
  "awaiting_author_approval",
  "approved",
  "published",
  "paused",
  "archived"
]);

export const AuthorProfileSchema = z.object({
  authorAddress: HexAddressSchema,
  displayName: z.string().min(1).max(100),
  penName: z.string().min(1).max(100).optional(),
  genres: z.array(z.string().min(1)).default([]),
  targetAudience: z.array(z.string().min(1)).default([]),
  preferredTone: z.array(z.string().min(1)).default([]),
  forbiddenTopics: z.array(z.string().min(1)).default([])
});

export const RightsPolicySchema = z.object({
  canRewrite: z.boolean().default(true),
  maxExcerptChars: z.number().int().positive().max(5000).default(700),
  attributionRequired: z.boolean().default(true),
  allowPaidContinuation: z.boolean().default(true),
  allowSocialPosting: z.boolean().default(true),
  expirationDate: z.string().datetime().optional(),
  forbiddenTopics: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional()
});

export const AgentPolicySchema = z.object({
  campaignId: z.number().int().nonnegative().optional(),
  maxPostsPerDay: z.number().int().min(0).max(25).default(3),
  maxSpendUsd: z.number().min(0).default(5),
  priceUsd: z.number().min(0.001).max(10).default(0.01),
  allowAutopublish: z.boolean().default(false),
  requireAuthorApproval: z.boolean().default(true),
  targetPlatforms: z.array(SocialPlatformSchema).default(["social_sandbox"]),
  targetAudience: z.array(z.string()).default([]),
  rights: RightsPolicySchema
});

export const ContentManifestSchema = z.object({
  workId: z.string().min(1),
  title: z.string().min(1).max(200),
  authorAddress: HexAddressSchema,
  encryptedContentUri: UriSchema,
  contentRootHash: Bytes32Schema,
  rightsPolicyHash: Bytes32Schema,
  createdAt: z.string().datetime()
});

export const TeaserCandidateSchema = z.object({
  id: z.string().min(1),
  teaserText: z.string().min(1).max(1500),
  continuationPreview: z.string().min(1).max(1500),
  socialCaption: z.string().min(1).max(2200),
  suggestedHashtags: z.array(z.string()).default([]),
  riskScore: z.number().min(0).max(1),
  rationale: z.string().min(1).max(1500)
});

export const TeaserGenerationRequestSchema = z.object({
  title: z.string().min(1).max(200),
  manuscriptExcerpt: z.string().min(50).max(12000),
  authorProfile: AuthorProfileSchema,
  agentPolicy: AgentPolicySchema,
  numberOfCandidates: z.number().int().min(1).max(5).default(3)
});

export const TeaserGenerationResponseSchema = z.object({
  candidates: z.array(TeaserCandidateSchema).min(1),
  recommendedCandidateId: z.string().min(1),
  policyNotes: z.array(z.string()).default([]),
  requiresAuthorApproval: z.boolean().default(true)
});

export const CampaignDraftSchema = z.object({
  agentId: z.number().int().nonnegative(),
  authorAddress: HexAddressSchema,
  payTo: HexAddressSchema,
  contentRootHash: Bytes32Schema,
  rightsPolicyHash: Bytes32Schema,
  agentPolicyHash: Bytes32Schema,
  teaserUri: UriSchema,
  priceMicrosUsd: z.number().int().positive(),
  ensAgentName: z.string().optional(),
  ensCampaignName: z.string().optional()
});

export const KeeperHubExecutionStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed"
]);

export const KeeperHubExecutionResultSchema = z.object({
  executionId: z.string().optional(),
  status: KeeperHubExecutionStatusSchema.optional(),
  transactionHash: z.string().optional(),
  transactionLink: z.string().optional(),
  gasUsedWei: z.string().optional(),
  result: z.unknown().optional(),
  error: z.unknown().optional()
});

export const SocialPostSchema = z.object({
  campaignId: z.number().int().nonnegative(),
  platform: SocialPlatformSchema,
  teaserText: z.string().min(1),
  socialCaption: z.string().min(1),
  mediaUri: UriSchema.optional(),
  unlockUrl: UriSchema
});

export const SocialMetricsSchema = z.object({
  impressions: z.number().int().nonnegative().default(0),
  reach: z.number().int().nonnegative().default(0),
  likes: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  unlockClicks: z.number().int().nonnegative().default(0),
  paidUnlocks: z.number().int().nonnegative().default(0),
  revenueUsd: z.number().nonnegative().default(0)
});

export type HexAddress = z.infer<typeof HexAddressSchema>;
export type Bytes32 = z.infer<typeof Bytes32Schema>;
export type AuthorProfile = z.infer<typeof AuthorProfileSchema>;
export type RightsPolicy = z.infer<typeof RightsPolicySchema>;
export type AgentPolicy = z.infer<typeof AgentPolicySchema>;
export type ContentManifest = z.infer<typeof ContentManifestSchema>;
export type TeaserCandidate = z.infer<typeof TeaserCandidateSchema>;
export type TeaserGenerationRequest = z.infer<typeof TeaserGenerationRequestSchema>;
export type TeaserGenerationResponse = z.infer<typeof TeaserGenerationResponseSchema>;
export type CampaignDraft = z.infer<typeof CampaignDraftSchema>;
export type KeeperHubExecutionResult = z.infer<typeof KeeperHubExecutionResultSchema>;
export type SocialPost = z.infer<typeof SocialPostSchema>;
export type SocialMetrics = z.infer<typeof SocialMetricsSchema>;

export function parseOrThrow<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown,
  label = "value"
): z.infer<TSchema> {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`${label} failed validation: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nestedValue]) => [key, sortJson(nestedValue)])
    );
  }

  return value;
}

