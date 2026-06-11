import MaterialIcon from "../ui/MaterialIcon.jsx";

/**
 * Full-width negotiation prompt on profile claim/proposal cards.
 */
export default function ClaimNegotiationBanner({ message, onNegotiate, disabled }) {
  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MaterialIcon
          name="chat"
          className="text-primary text-lg shrink-0"
        />
        <p className="text-sm text-primary font-medium">{message}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onNegotiate}
        className="w-full sm:w-auto px-6 py-2.5 rounded-full font-bold text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 shrink-0 disabled:opacity-50"
      >
        Negotiate
      </button>
    </div>
  );
}
