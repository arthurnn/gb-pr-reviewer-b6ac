import {
  defaultGitHubAuth,
  githubChannel,
} from "@cursor/july/channels/github";

const REVIEW_ACTIONS = new Set(["opened", "reopened", "ready_for_review"]);

export default githubChannel({
  botName: "sdk-pr-reviewer",
  webhookEvents: ["pull_request"],
  deliverReplies: false,
  progress: { reactions: false },
  onPullRequest: (ctx, pr) => {
    if (!REVIEW_ACTIONS.has(pr.action) || pr.draft) {
      return null;
    }
    return {
      auth: defaultGitHubAuth(ctx),
      title: `Review ${ctx.repository.fullName}#${pr.number}`,
      context: [
        "",
        `Review ${pr.url}. Inspect it first, then submit your verdict with submit_review.`,
      ],
    };
  },
});
