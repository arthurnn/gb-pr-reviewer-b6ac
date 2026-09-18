import { defineTool } from "@cursor/july/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Post the review decision to GitHub: approve the pull request, or comment asking for a human review.",
  inputSchema: z.object({
    prUrl: z
      .string()
      .describe("Pull request URL: https://github.com/owner/repo/pull/123"),
    verdict: z.enum(["approve", "request_human_review"]),
    summary: z
      .string()
      .describe("One or two sentences explaining the verdict."),
  }),
  async execute({ prUrl, verdict, summary }, ctx) {
    const url = new URL(prUrl);
    const [owner, repo, pulls, number] = url.pathname.split("/").filter(Boolean);
    const pull_number = Number.parseInt(number ?? "", 10);
    if (pulls !== "pull" || owner === undefined || Number.isNaN(pull_number)) {
      throw new Error(`Not a pull request URL: ${prUrl}`);
    }

    const review =
      verdict === "approve"
        ? { event: "APPROVE" as const, body: `PR reviewer: ${summary}` }
        : {
            event: "COMMENT" as const,
            body: `PR reviewer: this change needs a human review. ${summary}`,
          };

    const octokit = await ctx.host.github.getOctokit();
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number,
      event: review.event,
      body: review.body,
    });
    return { posted: true, ...review };
  },
});
