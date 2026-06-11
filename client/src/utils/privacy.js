export const VISIBILITY_OPTIONS = [
  { value: "everyone", label: "Show to everyone" },
  { value: "logged_in", label: "Show only to logged-in users" },
  { value: "hidden", label: "Hide for everyone" },
];

export const DEFAULT_PRIVACY = {
  publicDisplayName: "",
  emailVisibility: "hidden",
  phoneVisibility: "hidden",
};

export function normalizePrivacy(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const emailVisibility = VISIBILITY_OPTIONS.some(
    (opt) => opt.value === source.emailVisibility
  )
    ? source.emailVisibility
    : DEFAULT_PRIVACY.emailVisibility;
  const phoneVisibility = VISIBILITY_OPTIONS.some(
    (opt) => opt.value === source.phoneVisibility
  )
    ? source.phoneVisibility
    : DEFAULT_PRIVACY.phoneVisibility;

  return {
    publicDisplayName: String(source.publicDisplayName ?? "").trim(),
    emailVisibility,
    phoneVisibility,
  };
}

export function resolvePublicDisplayName(user) {
  if (!user) return "Member";
  const privacy = normalizePrivacy(user.privacy);
  return (
    privacy.publicDisplayName ||
    user.fullName?.trim() ||
    "Member"
  );
}
