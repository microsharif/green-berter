import { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Spinner from "../ui/Spinner.jsx";
import { updateListing } from "../../api/listings.js";
import { ApiError } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function EditListingModal({ open, listing, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: listing.title ?? "",
    story: listing.story ?? "",
    tags: (listing.tags ?? []).join(", "),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        title: form.title,
        story: form.story,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const res = await updateListing(listing.id, payload);
      toast.success("Listing updated.");
      onSaved(res.listing);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors);
      } else {
        toast.error(err.message ?? "Failed to update listing.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Edit listing"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="admin-btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="edit-listing-form" className="admin-btn-primary" disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : null}
            Save changes
          </button>
        </>
      }
    >
      <form id="edit-listing-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="admin-label" htmlFor="el-title">Title</label>
          <input id="el-title" className="admin-input" value={form.title} onChange={setField("title")} />
          {errors.title ? <p className="mt-1 text-xs text-danger">{errors.title}</p> : null}
        </div>
        <div>
          <label className="admin-label" htmlFor="el-story">Story / description</label>
          <textarea id="el-story" rows={5} className="admin-input" value={form.story} onChange={setField("story")} />
          {errors.story ? <p className="mt-1 text-xs text-danger">{errors.story}</p> : null}
        </div>
        <div>
          <label className="admin-label" htmlFor="el-tags">Tags (comma separated)</label>
          <input id="el-tags" className="admin-input" value={form.tags} onChange={setField("tags")} />
        </div>
      </form>
    </Modal>
  );
}
