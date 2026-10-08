import { useState } from "react";
import Spinner from "../ui/Spinner.jsx";
import { useToast } from "../../context/ToastContext.jsx";

/**
 * Inline form to create a child node. `requireCoords` adds latitude/longitude
 * inputs (location area leaves).
 */
export default function AddNodeForm({ onCreate, requireCoords = false, onDone }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: name.trim() };
      if (requireCoords) {
        payload.latitude = Number(latitude);
        payload.longitude = Number(longitude);
      }
      await onCreate(payload);
      toast.success("Created.");
      onDone();
    } catch (err) {
      toast.error(err.message ?? "Failed to create.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        autoFocus
        className="admin-input py-1.5 text-sm"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {requireCoords ? (
        <div className="flex gap-2">
          <input
            className="admin-input py-1.5 text-sm"
            placeholder="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
          />
          <input
            className="admin-input py-1.5 text-sm"
            placeholder="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
          />
        </div>
      ) : null}
      <button type="submit" className="admin-btn-primary w-full py-1.5 text-sm" disabled={saving}>
        {saving ? <Spinner className="h-4 w-4" /> : null}
        Add
      </button>
    </form>
  );
}
