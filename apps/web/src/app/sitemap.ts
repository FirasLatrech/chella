import type { MetadataRoute } from "next";
import { fetchFeed, fetchPeople } from "@/lib/api";

const BASE_URL = "https://www.chelaa.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, people] = await Promise.all([
    fetchFeed().catch(() => []),
    fetchPeople().catch(() => []),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/jobs`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/leaderboard`, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/sponsor`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE_URL}/post/${p.id}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const peopleRoutes: MetadataRoute.Sitemap = people.map((p) => ({
    url: `${BASE_URL}/people/${p.handle}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...postRoutes, ...peopleRoutes];
}
