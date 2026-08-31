import { fetchMe, fetchTopWeek, fetchTrendingTags } from "@/lib/api";
import { RailPopovers } from "./rail-popovers";

/*
 * Server component on live data: top contributors are ranked by reputation
 * points actually earned in the last 7 days, trending tags by post volume
 * with real week-over-week growth. "You" comes from the session.
 *
 * Renders as two small icon triggers rather than a permanent sidebar column —
 * their content now lives in a hover popover (RailPopovers), which lets the
 * feed grid run full width.
 */
export async function RightRail() {
  const [me, contributors, tags] = await Promise.all([
    fetchMe(),
    fetchTopWeek(),
    fetchTrendingTags(),
  ]);

  return <RailPopovers me={me} contributors={contributors} tags={tags} />;
}
