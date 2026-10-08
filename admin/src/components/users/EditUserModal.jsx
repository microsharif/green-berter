import { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Spinner from "../ui/Spinner.jsx";
import { updateUser } from "../../api/users.js";
import { ApiError } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function EditUserModal({ open, user, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    fullName: user.fullName ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    address: user.address ?? "",
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
      const res = await updateUser(user.id, form);
      toast.success("User updated.");
      onSaved(res.user);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors);
      } else {
        toast.error(err.message ?? "Failed to update user.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Edit user"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="admin-btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="edit-user-form" className="admin-btn-primary" disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : null}
            Save changes
          </button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="admin-label" htmlFor="eu-name">Full name</label>
          <input id="eu-name" className="admin-input" value={form.fullName} onChange={setField("fullName")} />
          {errors.fullName ? <p className="mt-1 text-xs text-danger">{errors.fullName}</p> : null}
        </div>
        <div>
          <label className="admin-label" htmlFor="eu-email">Email</label>
          <input id="eu-email" type="email" className="admin-input" value={form.email} onChange={setField("email")} />
          {errors.email ? <p className="mt-1 text-xs text-danger">{errors.email}</p> : null}
        </div>
        <div>
          <label className="admin-label" htmlFor="eu-phone">Phone</label>
          <input id="eu-phone" className="admin-input" value={form.phone} onChange={setField("phone")} />
        </div>
        <div>
          <label className="admin-label" htmlFor="eu-address">Address</label>
          <textarea id="eu-address" rows={3} className="admin-input" value={form.address} onChange={setField("address")} />
        </div>
      </form>
    </Modal>
  );
}
