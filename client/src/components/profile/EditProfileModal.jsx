import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useUI } from "../../context/UIContext.jsx";
import { uploadProfileImage } from "../../api/uploads.js";
import { ApiError } from "../../api/client.js";
import { DEMO_PROFILE_AVATAR_URL } from "../../data/catalog.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-[#fcf9f8] border border-zinc-200/80 focus:ring-2 focus:ring-primary/40 focus:border-primary/30 text-on-surface placeholder:text-on-surface-variant/50 text-base transition-all disabled:opacity-60";

const labelClass = "block text-sm font-bold text-green-900";

function uploadErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === "FILE_TOO_LARGE") return "Image must be 5MB or smaller.";
    if (err.code === "UNSUPPORTED_MEDIA_TYPE") {
      return "Use a JPG, PNG, WebP, or GIF image.";
    }
    if (err.code === "NETWORK_ERROR") {
      return "Could not reach the server. Check your connection.";
    }
    return err.message || "Could not upload your photo.";
  }
  return "Could not upload your photo.";
}

function buildInitialForm(user) {
  return {
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
    password: "",
    confirmPassword: "",
  };
}

/**
 * Modal editor for PATCH /users/:id — full name, contact fields, optional
 * avatar swap, and optional password change.
 */
export default function EditProfileModal({ open, onClose }) {
  const titleId = useId();
  const formId = useId();
  const { user, updateProfile } = useAuth();
  const { showToast } = useUI();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(() => buildInitialForm(user));
  const [fieldErrors, setFieldErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setForm(buildInitialForm(user));
    setFieldErrors({});
    setImagePreview(null);
    setPendingFile(null);
    setRemovePhoto(false);
    setShowPassword(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, user]);

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
    function onKeyDown(e) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pending, onClose]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  if (!open || !user) return null;

  const avatarDisplay =
    imagePreview || (!removePhoto && user.profileImageDataUrl) || DEMO_PROFILE_AVATAR_URL;

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function applyImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (JPG, PNG, or WebP).", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be 5MB or smaller.", "error");
      return;
    }
    setRemovePhoto(false);
    setPendingFile(file);
    setImagePreview(URL.createObjectURL(file));
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
  }

  function handleRemovePhoto() {
    setPendingFile(null);
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending) return;

    const errors = {};
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();

    if (!fullName) errors.fullName = "Full name is required";
    if (!email) errors.email = "Email is required";
    if (!phone) errors.phone = "Phone is required";
    if (!address) errors.address = "Address is required";

    const wantsPassword = Boolean(form.password || form.confirmPassword);
    if (wantsPassword) {
      if (!form.password) errors.password = "Enter a new password";
      else if (form.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }
      if (form.password !== form.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    setFieldErrors({});

    try {
      const patch = { fullName, email, phone, address };

      if (pendingFile) {
        try {
          const uploaded = await uploadProfileImage(pendingFile);
          patch.profileImageUrl = uploaded?.url;
        } catch (err) {
          showToast(uploadErrorMessage(err), "error");
          return;
        }
      } else if (removePhoto && user.profileImageDataUrl) {
        patch.profileImageUrl = "";
      }

      if (wantsPassword) {
        patch.password = form.password;
      }

      const result = await updateProfile(patch);
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        showToast(result.error ?? "Could not save changes.", "error");
        return;
      }

      showToast("Profile updated.", "success");
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={() => !pending && onClose()}
        disabled={pending}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-green-900/10 border border-green-900/5 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 shrink-0">
          <div>
            <h2
              id={titleId}
              className="text-xl font-black text-green-900 tracking-tight"
            >
              Edit profile
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Update how others see you on Green Barter
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-green-800 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex flex-col min-h-0 flex-1 overflow-y-auto"
        >
          <div className="px-6 py-5 flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3">
              <img
                src={avatarDisplay}
                alt=""
                className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-primary/20"
              />
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pending}
                  className="px-4 py-2 text-sm font-bold text-green-800 bg-green-50 rounded-full hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  Change photo
                </button>
                {(user.profileImageDataUrl || pendingFile) && !removePhoto ? (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={pending}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors disabled:opacity-50"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => applyImageFile(e.target.files?.[0])}
              />
              {fieldErrors.profileImageUrl ? (
                <p className="text-sm text-red-600">{fieldErrors.profileImageUrl}</p>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="edit-fullName" className={labelClass}>
                  Full name
                </label>
                <input
                  id="edit-fullName"
                  type="text"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  className={`${inputClass} mt-1.5`}
                  disabled={pending}
                />
                {fieldErrors.fullName ? (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="edit-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="edit-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className={`${inputClass} mt-1.5`}
                  disabled={pending}
                />
                {fieldErrors.email ? (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="edit-phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="edit-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className={`${inputClass} mt-1.5`}
                  disabled={pending}
                />
                {fieldErrors.phone ? (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="edit-address" className={labelClass}>
                  Address
                </label>
                <textarea
                  id="edit-address"
                  rows={3}
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  className={`${inputClass} mt-1.5 resize-y min-h-[5rem] leading-relaxed`}
                  disabled={pending}
                />
                {fieldErrors.address ? (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.address}</p>
                ) : null}
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-2">
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex items-center gap-2 text-sm font-bold text-green-800 hover:text-green-900"
              >
                <MaterialIcon
                  name={showPassword ? "expand_less" : "expand_more"}
                  className="text-lg"
                />
                {showPassword ? "Hide password change" : "Change password (optional)"}
              </button>
              {showPassword ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="edit-password" className={labelClass}>
                      New password
                    </label>
                    <input
                      id="edit-password"
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                      className={`${inputClass} mt-1.5`}
                      disabled={pending}
                    />
                    {fieldErrors.password ? (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                    ) : null}
                  </div>
                  <div>
                    <label htmlFor="edit-confirm" className={labelClass}>
                      Confirm new password
                    </label>
                    <input
                      id="edit-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(e) => setField("confirmPassword", e.target.value)}
                      className={`${inputClass} mt-1.5`}
                      disabled={pending}
                    />
                    {fieldErrors.confirmPassword ? (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.confirmPassword}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-zinc-100 bg-[#fcf9f8]/80 shrink-0 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex-1 py-3 font-bold text-green-800 bg-white border border-green-800/15 rounded-full hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-3 font-bold text-white bg-primary rounded-full shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
