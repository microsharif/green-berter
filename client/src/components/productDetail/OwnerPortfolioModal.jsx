import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { fetchUser } from "../../api/users.js";
import { DEMO_PROFILE_AVATAR_URL } from "../../data/catalog.js";
import { resolveMediaUrl } from "../../utils/mediaUrl.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-3 border-b border-zinc-100 last:border-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-800 break-words">{value}</dd>
    </div>
  );
}

/**
 * Public owner portfolio — loaded from GET /users/:id when an owner id exists.
 */
export default function OwnerPortfolioModal({ open, onClose, seller }) {
  const titleId = useId();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const ownerId = seller?.ownerId ?? null;
  const fallbackName = seller?.name?.trim() || "Community member";
  const fallbackAvatar = seller?.avatar || DEMO_PROFILE_AVATAR_URL;

  useEffect(() => {
    if (!open) return;
    setProfile(null);
    setLoadError(false);
    if (!ownerId) return undefined;

    let cancelled = false;
    setLoading(true);
    fetchUser(ownerId)
      .then((data) => {
        if (!cancelled) setProfile(data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, ownerId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !seller) return null;

  const displayName = profile?.fullName?.trim() || fallbackName;
  const avatarSrc = profile?.profileImageUrl
    ? resolveMediaUrl(profile.profileImageUrl)
    : fallbackAvatar;
  const memberSince = formatDate(profile?.createdAt);

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full sm:max-w-md max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-green-900/10 border border-green-900/5 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 shrink-0">
          <div>
            <h2
              id={titleId}
              className="text-xl font-black text-green-900 tracking-tight"
            >
              Member portfolio
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Public profile on The Regenerative Exchange
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-green-800 transition-colors"
            aria-label="Close"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 space-y-6">
          <div className="flex items-center gap-4">
            <img
              src={avatarSrc}
              alt=""
              className="h-20 w-20 rounded-full object-cover bg-surface-container"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-bold text-xl text-green-900 truncate">
                  {displayName}
                </h3>
                {seller.verified ? (
                  <MaterialIcon
                    name="verified"
                    className="text-emerald-600 text-lg shrink-0"
                    filled
                  />
                ) : null}
              </div>
              <p className="text-zinc-500 text-sm">
                {seller.subtitle || "Community member"}
              </p>
              {memberSince ? (
                <p className="text-xs text-zinc-400 mt-1">Member since {memberSince}</p>
              ) : null}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Loading profile…</p>
          ) : loadError ? (
            <p className="text-sm text-zinc-500">
              Could not load full profile details. Showing basic listing info.
            </p>
          ) : (
            <dl className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
              <InfoRow label="Display name" value={displayName} />
              <InfoRow label="Email" value={profile?.email} />
              <InfoRow label="Phone" value={profile?.phone} />
              {!profile?.email && !profile?.phone && !loading && ownerId ? (
                <p className="text-xs text-zinc-500 pt-2">
                  Contact details are hidden based on this member&apos;s privacy
                  settings.
                </p>
              ) : null}
            </dl>
          )}

          <p className="text-xs text-zinc-500 leading-relaxed">
            Browse their active listings on the marketplace or start a claim from
            this item page to connect.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-full border border-outline-variant font-bold hover:bg-zinc-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
