"use strict";
`` `json
{
  "code": "import type { Result } from '$lib/types/Result';\nimport type { RedditPost, RedditTrendsConfig, RedditTrendsError } from '$lib/ai/types/RedditTrendsTypes';\nimport { logger } from '$lib/utils/logger';\nimport { REDDIT_API_BASE_URL, DEFAULT_SUBREDDITS, MAX_POSTS_PER_SUBREDDIT } from '$lib/ai/config/RedditTrendsConfig';\n\n/**\n * Service layer for fetching and processing Reddit trends.\n * \n * Layer: Service (Layer 4)\n * Responsibilities:\n * - Fetch trending posts from Reddit API\n * - Transform raw API responses to domain types\n * - Handle rate limiting and caching\n * - Provide error handling with structured results\n */\nexport class RedditTrendsService {\n  private readonly config: RedditTrendsConfig;\n  private readonly cache: Map<string, { data: RedditPost[]; timestamp: number }>;\n  private readonly cacheTtlMs: number;\n\n  constructor(config?: Partial<RedditTrendsConfig>) {\n    this.config = {\n      subreddits: config?.subreddits ?? DEFAULT_SUBREDDITS,\n      maxPostsPerSubreddit: config?.maxPostsPerSubreddit ?? MAX_POSTS_PER_SUBREDDIT,\n      apiBaseUrl: config?.apiBaseUrl ?? REDDIT_API_BASE_URL,\n      userAgent: config?.userAgent ?? 'HarnessAI/1.0',\n      enableCache: config?.enableCache ?? true,\n    };\n    this.cache = new Map();\n    this.cacheTtlMs = 5 * 60 * 1000; // 5 minutes\n  }\n\n  /**\n   * Fetches trending posts from configured subreddits.\n   * Returns a Result type for explicit error handling.\n   */\n  async fetchTrends(): Promise<Result<RedditPost[], RedditTrendsError>> {\n    const cacheKey = this.buildCacheKey();\n    \n    // Check cache first if enabled\n    if (this.config.enableCache) {\n      const cached = this.getFromCache(cacheKey);\n      if (cached) {\n        logger.info({ cacheHit: true }, 'Returning cached Reddit trends');\n        return { success: true, data: cached };\n      }\n    }\n\n    try {\n      const allPosts: RedditPost[] = [];\n      \n      // Fetch from each subreddit in parallel with error isolation\n      const fetchPromises = this.config.subreddits.map(async (subreddit) => {\n        const result = await this.fetchSubredditPosts(subreddit);\n        return result.success ? result.data : [];\n      });\n\n      const results = await Promise.all(fetchPromises);\n      \n      // Flatten and deduplicate posts by ID\n      const seenIds = new Set<string>();\n      for (const posts of results) {\n        for (const post of posts) {\n          if (!seenIds.has(post.id)) {\n            seenIds.add(post.id);\n            allPosts.push(post);\n          }\n        }\n      }\n\n      // Sort by score descending (trending)\n      allPosts.sort((a, b) => b.score - a.score);\n\n      // Update cache\n      if (this.config.enableCache) {\n        this.setCache(cacheKey, allPosts);\n      }\n\n      logger.info(\n        { postCount: allPosts.length, subreddits: this.config.subreddits },\n        'Successfully fetched Reddit trends'\n      );\n\n      return { success: true, data: allPosts };\n    } catch (error) {\n      const serviceError = this.normalizeError(error);\n      logger.error(\n        { error: serviceError, subreddits: this.config.subreddits },\n        'Failed to fetch Reddit trends'\n      );\n      return { success: false, error: serviceError };\n    }\n  }\n\n  /**\n   * Fetches posts from a single subreddit.\n   * Isolates errors per subreddit to prevent total failure.\n   */\n  private async fetchSubredditPosts(\n    subreddit: string\n  ): Promise<Result<RedditPost[], RedditTrendsError>> {\n    const url = `;
$;
{
    this.config.apiBaseUrl;
}
/r/$;
{
    subreddit;
}
/hot.json?limit=${this.config.maxPostsPerSubreddit}`;\n\n    try {\n      const response = await fetch(url, {\n        headers: {\n          'User-Agent': this.config.userAgent,\n          'Accept': 'application/json;
',\n        },\n      });\n\n      if (!response.ok) {\n        const error: RedditTrendsError = {\n          code: ';
API_ERROR;
',\n          message: `Reddit API returned ${response.status}: ${response.statusText}`,\n          subreddit,\n          retryable: response.status >= 500 || response.status === 429,\n        };\n        return { success: false, error };\n      }\n\n      const rawData = await response.json();\n      const posts = this.transformPosts(rawData, subreddit);\n\n      return { success: true, data: posts };\n    } catch (error) {\n      const normalizedError = this.normalizeError(error, subreddit);\n      logger.warn(\n        { error: normalizedError, subreddit },\n        ';
Failed;
to;
fetch;
subreddit;
posts;
'\n      );\n      return { success: false, error: normalizedError };\n    }\n  }\n\n  /**\n   * Transforms raw Reddit API response to domain types.\n   * Validates and sanitizes all fields.\n   */\n  private transformPosts(rawData: unknown, subreddit: string): RedditPost[] {\n    if (!rawData || typeof rawData !== ';
object;
') {\n      return [];\n    }\n\n    const data = rawData as { data?: { children?: Array<{ data?: unknown }> } };\n    const children = data.data?.children ?? [];\n\n    return children\n      .map((child): RedditPost | null => {\n        const post = child.data;\n        if (!post || typeof post !== ';
object;
') return null;\n\n        const p = post as Record<string, unknown>;\n        \n        // Extract and validate required fields\n        const id = this.extractString(p, ';
id;
');\n        const title = this.extractString(p, ';
title;
');\n        const author = this.extractString(p, ';
author;
');\n        const permalink = this.extractString(p, ';
permalink;
');\n        const score = this.extractNumber(p, ';
score;
');\n        const numComments = this.extractNumber(p, ';
num_comments;
');\n        const createdUtc = this.extractNumber(p, ';
created_utc;
');\n        const url = this.extractString(p, ';
url;
');\n        const selftext = this.extractString(p, ';
selftext;
');\n        const thumbnail = this.extractString(p, ';
thumbnail;
');\n\n        // Skip posts with missing critical fields\n        if (!id || !title || !permalink) {\n          return null;\n        }\n\n        return {\n          id,\n          title: this.sanitizeText(title),\n          author: author ?? '[deleted];
',\n          subreddit,\n          permalink: `https://reddit.com${permalink}`,\n          score: Math.max(0, score ?? 0),\n          numComments: Math.max(0, numComments ?? 0),\n          createdAt: new Date((createdUtc ?? 0) * 1000),\n          url: url ?? `https://reddit.com${permalink}`,\n          selftext: selftext ? this.sanitizeText(selftext) : undefined,\n          thumbnail: thumbnail && thumbnail !== ';
self;
' && thumbnail !== ';
' \n            ? thumbnail \n            : undefined,\n          isSelfPost: url?.includes(';
reddit.com;
') ?? false,\n        };\n      })\n      .filter((post): post is RedditPost => post !== null);\n  }\n\n  /** Extracts a string field from an object safely. */\n  private extractString(obj: Record<string, unknown>, key: string): string | undefined {\n    const value = obj[key];\n    return typeof value === ';
string;
' ? value : undefined;\n  }\n\n  /** Extracts a number field from an object safely. */\n  private extractNumber(obj: Record<string, unknown>, key: string): number | undefined {\n    const value = obj[key];\n    return typeof value === ';
number;
' ? value : undefined;\n  }\n\n  /** Sanitizes text content to prevent XSS and normalize whitespace. */\n  private sanitizeText(text: string): string {\n    return text\n      .replace(/[\\x00-\\x08\\x0b-\\x0c\\x0e-\\x1f]/g, ';
') // Remove control characters\n      .replace(/\\s+/g, ';
') // Normalize whitespace\n      .trim();\n  }\n\n  /** Normalizes various error types to RedditTrendsError. */\n  private normalizeError(error: unknown, subreddit?: string): RedditTrendsError {\n    if (error instanceof Error) {\n      // Network errors are typically retryable\n      const isNetworkError = \n        error.message.includes(';
fetch;
') ||\n        error.message.includes(';
network;
') ||\n        error.message.includes(';
ECONNREFUSED;
');\n\n      return {\n        code: isNetworkError ? ';
NETWORK_ERROR;
' : ';
UNKNOWN_ERROR;
',\n        message: error.message,\n        subreddit,\n        retryable: isNetworkError,\n        cause: error,\n      };\n    }\n\n    return {\n      code: ';
UNKNOWN_ERROR;
',\n      message: String(error),\n      subreddit,\n      retryable: false,\n    };\n  }\n\n  /** Builds a cache key from current configuration. */\n  private buildCacheKey(): string {\n    return `${this.config.subreddits.sort().join(', ')}:${this.config.maxPostsPerSubreddit}`;\n  }\n\n  /** Retrieves cached data if still valid. */\n  private getFromCache(key: string): RedditPost[] | null {\n    const entry = this.cache.get(key);\n    if (!entry) return null;\n    \n    const isExpired = Date.now() - entry.timestamp > this.cacheTtlMs;\n    if (isExpired) {\n      this.cache.delete(key);\n      return null;\n    }\n    \n    return entry.data;\n  }\n\n  /** Stores data in cache with timestamp. */\n  private setCache(key: string, data: RedditPost[]): void {\n    this.cache.set(key, { data, timestamp: Date.now() });\n    \n    // Simple LRU: limit cache size\n    if (this.cache.size > 10) {\n      const firstKey = this.cache.keys().next().value;\n      this.cache.delete(firstKey);\n    }\n  }\n\n  /** Clears all cached data. */\n  clearCache(): void {\n    this.cache.clear();\n    logger.info(';
Reddit;
trends;
cache;
cleared;
');\n  }\n}\n\n/** Factory function for creating service instances. */\nexport function createRedditTrendsService(\n  config?: Partial<RedditTrendsConfig>\n): RedditTrendsService {\n  return new RedditTrendsService(config);\n}\n";
`` `;
//# sourceMappingURL=RedditTrendsService.js.map