import { useEffect, useState } from "react";
import { flattenLocationTree } from "./flattenBrowseTrees.js";
import SearchableFilterCombobox from "./SearchableFilterCombobox.jsx";

export default function LocationFilterSearch({
  selectedLocation,
  onSelectLocation,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setItems([]);

    flattenLocationTree()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SearchableFilterCombobox
      items={items}
      loading={loading}
      error={error}
      selected={selectedLocation}
      onSelect={onSelectLocation}
      placeholder="Search division, city, or area…"
      allLabel="All locations"
    />
  );
}
