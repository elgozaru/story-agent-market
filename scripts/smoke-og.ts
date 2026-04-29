import { generateTeasersWith0G } from "../packages/og/src/compute";

async function run() {
  const response = await generateTeasersWith0G({
    title: "The Lighthouse That Forgot",
    manuscriptExcerpt:
      "The lighthouse woke only when the moon forgot its name. Mara found the first letter beneath the rusted stairs, sealed with wax that smelled faintly of rain and ash.",
    numberOfCandidates: 3,
    authorProfile: {
      authorAddress: "0x0000000000000000000000000000000000000001",
      displayName: "Demo Author",
      genres: ["speculative fiction"],
      targetAudience: ["readers of literary sci-fi"],
      preferredTone: ["mysterious", "cinematic"],
      forbiddenTopics: []
    },
    agentPolicy: {
      maxPostsPerDay: 3,
      maxSpendUsd: 5,
      priceUsd: 0.01,
      allowAutopublish: false,
      requireAuthorApproval: true,
      targetPlatforms: ["social_sandbox"],
      targetAudience: ["readers of literary sci-fi"],
      rights: {
        canRewrite: true,
        maxExcerptChars: 700,
        attributionRequired: true,
        allowPaidContinuation: true,
        allowSocialPosting: true,
        forbiddenTopics: []
      }
    }
  });

  console.log(JSON.stringify(response, null, 2));
}
run();
