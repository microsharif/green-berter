import { useCallback, useEffect, useState } from "react";
import { fetchClaimMessages } from "../api/claimMessages.js";

/**
 * Loads negotiation thread state for a claim (owner + claimer both sent messages).
 */
export function useClaimNegotiationHint(claim, enabled = true, refreshKey = 0) {
  const [state, setState] = useState({
    loading: true,
    fromOwner: false,
    fromClaimer: false,
    hasMessages: false,
  });

  const reload = useCallback(async () => {
    if (!enabled || !claim?.id) {
      setState({
        loading: false,
        fromOwner: false,
        fromClaimer: false,
        hasMessages: false,
      });
      return;
    }
    try {
      const msgs = await fetchClaimMessages(claim.id);
      const ownerId = String(claim.ownerUserId ?? "");
      const claimerId = String(claim.claimerUserId ?? "");
      const fromOwner = msgs.some((m) => String(m.senderUserId) === ownerId);
      const fromClaimer = msgs.some((m) => String(m.senderUserId) === claimerId);
      setState({
        loading: false,
        fromOwner,
        fromClaimer,
        hasMessages: msgs.length > 0,
      });
    } catch {
      setState({
        loading: false,
        fromOwner: false,
        fromClaimer: false,
        hasMessages: false,
      });
    }
  }, [enabled, claim?.id, claim?.ownerUserId, claim?.claimerUserId]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  const bothMessaged = state.fromOwner && state.fromClaimer;

  return { ...state, bothMessaged, reload };
}
