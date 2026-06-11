import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useUI } from "../../context/UIContext.jsx";
import { delay } from "../../utils/delay.js";
import { useProgressNavigate } from "../../hooks/useNavigationProgress.js";
import { ApiError } from "../../api/client.js";
import { uploadProfileImage } from "../../api/uploads.js";
import AuthFlowLoader from "./AuthFlowLoader.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";

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

const inputClass =
  "w-full px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl bg-surface-container-low border border-transparent focus:ring-2 focus:ring-primary/40 focus:border-primary/30 text-on-surface placeholder:text-on-surface-variant/50 text-base transition-all duration-200 disabled:opacity-60";

const addressTextareaClass = `${inputClass} min-h-[5.5rem] sm:min-h-[6.5rem] py-3 sm:py-3.5 resize-y align-top leading-relaxed`;

const labelClass = "block text-sm font-bold text-gray-800 dark:text-gray-200";

function RequiredMark() {
  return (
    <span className="text-red-600 ml-0.5" aria-hidden="true">
      *
    </span>
  );
}

export default function RegisterFormPanel({ onSwitchToLogin }) {
  const { showToast } = useUI();
  const { register } = useAuth();
  const navigate = useProgressNavigate();
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageName, setImageName] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function applyImageFile(file) {
    if (!file) {
      setImagePreview(null);
      setImageName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (JPG, PNG, or WebP).", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be 5MB or smaller.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setImageName(file.name);
    setImagePreview(URL.createObjectURL(file));
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
    }
  }

  function handleImageChange(e) {
    applyImageFile(e.target.files?.[0]);
  }

  function handleImageDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    applyImageFile(file);
  }

  function clearImage() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImagePreview(null);
    setImageName("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const address = String(fd.get("address") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const pwd = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    if (pwd && confirm && pwd !== confirm) {
      showToast("Passwords do not match.", "error");
      return;
    }

    // Two-step submit: when the user attached a photo we first POST it to
    // /upload/profile-image, then send the returned URL alongside the
    // registration payload. The image is optional — if upload fails we
    // surface the error and bail (we don't silently register without it).
    const imageFile = fileInputRef.current?.files?.[0] ?? null;
    setPending(true);
    try {
      let profileImageUrl;
      if (imageFile) {
        try {
          const uploaded = await uploadProfileImage(imageFile);
          profileImageUrl = uploaded?.url;
        } catch (err) {
          showToast(uploadErrorMessage(err), "error");
          return;
        }
      }

      const result = await register({
        fullName,
        email,
        password: pwd,
        address,
        phone,
        profileImageUrl,
      });
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      await delay();
      showToast("Account created. Please sign in.", "success");
      navigate("/login", { replace: true, state: { email } });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto relative">
      <div className="mb-8 sm:mb-10">
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-on-surface mb-2">
          Create an account
        </h2>
        <p className="text-on-surface-variant text-sm sm:text-base">
          Join the collective and start your circular journey.
        </p>
      </div>

      <form
        className="space-y-5 sm:space-y-6"
        onSubmit={handleSubmit}
        aria-busy={pending}
      >
        <div className="space-y-2">
          <label className={labelClass} htmlFor="reg-fullname">
            Full Name
            <RequiredMark />
          </label>
          <input
            id="reg-fullname"
            name="fullName"
            className={inputClass}
            placeholder="John Doe"
            type="text"
            autoComplete="name"
            required
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass} htmlFor="reg-email">
            Email Address
            <RequiredMark />
          </label>
          <input
            id="reg-email"
            name="email"
            className={inputClass}
            placeholder="hello@greenbarter.com"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass} htmlFor="reg-phone">
            Phone number
            <RequiredMark />
          </label>
          <input
            id="reg-phone"
            name="phone"
            className={inputClass}
            placeholder="+1 555 123 4567"
            type="tel"
            autoComplete="tel"
            required
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass} htmlFor="reg-address">
            Address
          </label>
          <textarea
            id="reg-address"
            name="address"
            className={addressTextareaClass}
            placeholder="City, state or full address (e.g. Portland, OR)"
            rows={3}
            autoComplete="street-address"
            required
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <span className={labelClass}>Profile photo</span>
          <p className="text-xs text-on-surface-variant -mt-1 mb-1">
            Optional. JPG, PNG, or WebP — max 5MB.
          </p>
          <input
            ref={fileInputRef}
            id="reg-profile-image"
            name="profileImage"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleImageChange}
            disabled={pending}
          />
          <div
            role="presentation"
            onDragOver={(e) => e.preventDefault()}
            onDrop={imagePreview || pending ? undefined : handleImageDrop}
            className={`rounded-xl border-2 border-dashed border-outline-variant/50 bg-surface-container-low/80 transition-colors ${
              pending ? "pointer-events-none opacity-60" : ""
            } ${imagePreview ? "p-2" : "p-6"}`}
          >
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  className="w-full max-h-48 object-cover rounded-lg"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-on-surface-variant truncate pr-2">
                    {imageName}
                  </span>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="shrink-0 text-sm font-semibold text-secondary hover:underline"
                    disabled={pending}
                  >
                    Remove
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 w-full py-2.5 rounded-full border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
                  disabled={pending}
                >
                  Choose a different image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 py-2 text-on-surface-variant hover:text-on-surface transition-colors"
                disabled={pending}
              >
                <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <MaterialIcon
                    name="add_a_photo"
                    className="text-2xl text-on-surface-variant"
                  />
                </div>
                <span className="text-sm font-semibold text-on-surface">
                  Upload an image
                </span>
                <span className="text-xs text-on-surface-variant">
                  Click to browse or drag and drop
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-2">
            <label className={labelClass} htmlFor="reg-password">
              Password
              <RequiredMark />
            </label>
            <input
              id="reg-password"
              name="password"
              className={inputClass}
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="reg-confirm">
              Confirm
            </label>
            <input
              id="reg-confirm"
              name="confirm"
              className={inputClass}
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
              required
              disabled={pending}
            />
          </div>
        </div>

        <div className="flex items-start gap-3 pt-1">
          <input
            className="mt-1.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0"
            id="reg-terms"
            name="terms"
            type="checkbox"
            required
            disabled={pending}
          />
          <label
            className="text-sm text-on-surface leading-relaxed"
            htmlFor="reg-terms"
          >
            I agree to the{" "}
            <Link
              className="text-primary font-semibold hover:underline"
              to="/terms-conditions"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className="text-primary font-semibold hover:underline"
              to="/privacy-policy"
            >
              Privacy Policy
            </Link>
            .
            <RequiredMark />
          </label>
        </div>

        <button
          className="w-full py-4 sm:py-5 bg-primary hover:bg-primary-container text-on-primary font-display font-bold text-base sm:text-lg rounded-full shadow-lg hover:shadow-xl active:scale-[0.99] transition-all duration-300 disabled:opacity-70 disabled:pointer-events-none"
          type="submit"
          disabled={pending}
        >
          {pending ? "Creating account…" : "Register"}
        </button>

        <p
          className={`text-center text-sm text-on-surface-variant pt-2 ${pending ? "pointer-events-none opacity-60" : ""}`}
        >
          Already have an account?{" "}
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary font-bold hover:underline underline-offset-4"
              disabled={pending}
            >
              Sign In
            </button>
          ) : (
            <Link
              to="/login"
              className="text-primary font-bold hover:underline underline-offset-4"
            >
              Sign In
            </Link>
          )}
        </p>
      </form>
      <AuthFlowLoader active={pending} label="Creating your account…" />
    </div>
  );
}
