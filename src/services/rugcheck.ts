import { RUGCHECK_BASE_URL } from "../config/constants.js";
import { fetchJson } from "../lib/http.js";
import { globalCache } from "../lib/cache.js";
import { UpstreamError } from "../lib/errors.js";
import { RugCheckSummaryResponse } from "../types/index.js";

const CACHE_PREFIX = "rugcheck:";

export class RugCheckService {
  async getSummary(mint: string): Promise<RugCheckSummaryResponse> {
    const cacheKey = `${CACHE_PREFIX}${mint}`;
    const cached = globalCache.get<RugCheckSummaryResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `${RUGCHECK_BASE_URL}/tokens/${encodeURIComponent(mint)}/report/summary`;

    try {
      const data = await fetchJson<RugCheckSummaryResponse>(url);
      
      const normalized: RugCheckSummaryResponse = {
        tokenProgram: data.tokenProgram,
        tokenType: data.tokenType,
        risks: Array.isArray(data.risks) ? data.risks : [],
        score: typeof data.score === "number" ? data.score : 0,
        score_normalised: typeof data.score_normalised === "number" ? data.score_normalised : 0,
        lpLockedPct: typeof data.lpLockedPct === "number" ? data.lpLockedPct : 0
      };

      globalCache.set(cacheKey, normalized);
      return normalized;
    } catch (error) {
      // If RugCheck upstream returns 400 "unable to generate report" or 404, synthesize an unindexed/empty report
      if (error instanceof UpstreamError && (error.statusCode === 400 || error.statusCode === 404)) {
        const fallback: RugCheckSummaryResponse = {
          risks: [
            {
              name: "Report Unavailable",
              value: "UNINDEXED",
              description: "RugCheck has not indexed or was unable to generate a report for this mint",
              score: 0,
              level: "warn"
            }
          ],
          score: 0,
          score_normalised: 0,
          lpLockedPct: 0
        };
        globalCache.set(cacheKey, fallback, 10000); // short cache for unavailable
        return fallback;
      }
      throw error;
    }
  }
}

export const rugCheckService = new RugCheckService();
