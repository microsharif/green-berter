import { useCallback, useEffect, useState } from "react";
import { fetchClaims } from "../api/claims.js";
import { isMongoListingId, pickMyClaim } from "../components/productDetail/claimUtils.js";

/**
 * Loads claims for a listing when the viewer is signed in (DFD §4 — database only).
 */
export function useProductClaims(listingId, { enabled, userId }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const canLoad = Boolean(enabled && userId && isMongoListingId(listingId));

  const refresh = useCallback(async () => {
    if (!canLoad) {
      setClaims([]);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const { claims: rows } = await fetchClaims({ listingId, limit: 50 });
      setClaims(rows);
    } catch {
      setError(true);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [canLoad, listingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const myClaim = pickMyClaim(claims, userId);

  return { claims, myClaim, loading, error, refresh, canLoad };
}
