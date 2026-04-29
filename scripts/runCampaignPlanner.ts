export async function runCampaignPlanner(input: {
  title: string;
  manuscriptExcerpt: string;
  authorPolicy: unknown;
}) {
  const teaserResponse = await generateTeasersWith0G({
    title: input.title,
    excerpt: input.manuscriptExcerpt,
    policy: input.authorPolicy
  });

  return {
    candidates: teaserResponse,
    requiresAuthorApproval: true,
    nextAction: "AUTHOR_APPROVAL"
  };
}

