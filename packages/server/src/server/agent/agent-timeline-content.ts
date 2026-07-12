import type { AgentTimelineItem } from "./agent-sdk-types.js";

const TOOL_CALL_CONTENT_MAX_LENGTH = 64 * 1024;

export function limitAgentTimelineItemContent(item: AgentTimelineItem): AgentTimelineItem {
  if (
    item.type !== "tool_call" ||
    item.detail.type !== "shell" ||
    typeof item.detail.output !== "string"
  ) {
    return item;
  }
  if (item.detail.output.length <= TOOL_CALL_CONTENT_MAX_LENGTH) {
    return item;
  }
  return {
    ...item,
    detail: {
      ...item.detail,
      output: item.detail.output.slice(0, TOOL_CALL_CONTENT_MAX_LENGTH),
    },
  };
}
