import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import { VISIBILITY_OPTIONS, normalizePrivacy } from "../../utils/privacy.js";

function VisibilityField({ label, name, value, onChange, disabled }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-bold text-green-900 dark:text-green-100">
        {label}
      </legend>
      <div className="space-y-2">
        {VISIBILITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
              value === option.value
                ? "border-primary bg-primary/5"
                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-200">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Privacy controls for how the member appears to others on listings and claims.
 */
export default function ProfileSettingsSection() {
  const { user, updatePrivacySettings } = useAuth();
  const [form, setForm] = useState(() => normalizePrivacy(user?.privacy));
  const [displayNameMode, setDisplayNameMode] = useState(() => {
    const privacy = normalizePrivacy(user?.privacy);
    return privacy.publicDisplayName ? "custom" : "fullName";
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const privacy = normalizePrivacy(user?.privacy);
    setForm(privacy);
    setDisplayNameMode(privacy.publicDisplayName ? "custom" : "fullName");
  }, [user?.privacy]);

  if (!user) return null;

  const fullName = user.fullName?.trim() || "Member";

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const trimmedCustomName = form.publicDisplayName.trim();
    if (displayNameMode === "custom" && !trimmedCustomName) {
      setSaving(false);
      setError("Enter a custom display name or choose full name.");
      return;
    }

    const result = await updatePrivacySettings({
      publicDisplayName:
        displayNameMode === "fullName" ? "" : trimmedCustomName,
      emailVisibility: form.emailVisibility,
      phoneVisibility: form.phoneVisibility,
    });

    setSaving(false);
    if (result.ok) {
      setMessage("Privacy settings saved.");
    } else {
      setError(result.error ?? "Could not save settings.");
    }
  }

  return (
    <RevealOnScroll as="section" id="profile-settings" className="scroll-mt-24 space-y-8 pt-12">
      <div>
        <h2 className="text-2xl font-black text-green-900 dark:text-green-100">
          Privacy settings
        </h2>
        <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
          Choose how your name, email, and phone appear to others on listings,
          claims, and public profile views.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-8 max-w-2xl"
      >
        <div className="space-y-3">
          <label
            htmlFor="display-name-mode"
            className="text-sm font-bold text-green-900 dark:text-green-100"
          >
            Display name publicly as
          </label>
          <select
            id="display-name-mode"
            value={displayNameMode}
            onChange={(event) => {
              const mode = event.target.value;
              setDisplayNameMode(mode);
              setForm((prev) => ({
                ...prev,
                publicDisplayName: mode === "fullName" ? "" : prev.publicDisplayName,
              }));
            }}
            disabled={saving}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100"
          >
            <option value="fullName">Full name — {fullName}</option>
            <option value="custom">Custom display name</option>
          </select>
          {displayNameMode === "custom" ? (
            <input
              type="text"
              value={form.publicDisplayName}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  publicDisplayName: event.target.value,
                }))
              }
              maxLength={60}
              placeholder="e.g. sjsujon"
              disabled={saving}
              autoFocus
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100"
            />
          ) : null}
          <p className="text-xs text-zinc-500">
            This is the name shown on your listings and when others view your
            profile. Your full legal name stays on your account info page.
          </p>
        </div>

        <VisibilityField
          label="Display email publicly"
          name="emailVisibility"
          value={form.emailVisibility}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, emailVisibility: value }))
          }
          disabled={saving}
        />

        <VisibilityField
          label="Display phone publicly"
          name="phoneVisibility"
          value={form.phoneVisibility}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, phoneVisibility: value }))
          }
          disabled={saving}
        />

        {message ? (
          <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
            <MaterialIcon name="check_circle" className="text-base" />
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full font-bold text-sm bg-primary text-white shadow-md shadow-primary/20 hover:brightness-105 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save privacy settings"}
        </button>
      </form>
    </RevealOnScroll>
  );
}
