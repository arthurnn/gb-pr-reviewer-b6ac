import { defineAgent } from "@cursor/july";

export default defineAgent({
  architecture: "v2",
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
});
