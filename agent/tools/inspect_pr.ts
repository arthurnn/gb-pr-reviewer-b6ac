import { defineTool } from "@cursor/july/tools";
import { z } from "zod";

export type Complexity = "trivial" | "moderate" | "large";

function rateComplexity(linesChanged: number, changedFiles: number): Complexity {
  if (linesChanged <= 25 && changedFiles <= 2) {
    return "trivial";
  }

  if (linesChanged <= 400 && changedFiles <= 15) {
    return "moderate";
  }

  return "large";
}

/** Keep one oversized file from flooding the model's context. */
function trimPatch(patch: string | undefined): string | undefined {
  if (patch === undefined || patch.length <= 3000) {
    return patch;
  }

  return `${patch.slice(0, 3000)}\n[... patch trimmed ...]`;
}

export default defineTool({
  description:
    "Fetch a pull request's title, stats, and per-file patches, plus a deterministic complexity rating (trivial, moderate, or large). Call this before any review decision.",
  inputSchema: z.object({
    prUrl: z
      .string()
      .describe("Pull request URL: https://github.com/owner/repo/pull/123"),
  }),
  async execute({ prUrl }, ctx) {
    const url = new URL(prUrl);
    const [owner, repo, pulls, number] = url.pathname.split("/").filter(Boolean);
    const pull_number = Number.parseInt(number ?? "", 10);
    if (pulls !== "pull" || owner === undefined || Number.isNaN(pull_number)) {
      throw new Error(`Not a pull request URL: ${prUrl}`);
    }

    const octokit = await ctx.host.github.getOctokit();
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number,
      per_page: 100,
    });

    const complexity = rateComplexity(
      pr.additions + pr.deletions,
      pr.changed_files
    );

    return {
      title: pr.title,
      author: pr.user?.login,
      state: pr.state,
      draft: pr.draft ?? false,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      complexity,
      files: files.map((file) => ({
        path: file.filename,
        additions: file.additions,
        deletions: file.deletions,
        ...(complexity === "large" ? {} : { patch: trimPatch(file.patch) }),
      })),
    };
  },
});
