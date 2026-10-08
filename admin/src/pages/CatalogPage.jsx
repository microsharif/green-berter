import { useState } from "react";
import PageHeader from "../components/layout/PageHeader.jsx";
import TreeBrowser from "../components/catalog/TreeBrowser.jsx";
import AddNodeForm from "../components/catalog/AddNodeForm.jsx";
import {
  createCategory,
  createLocation,
  fetchCategories,
  fetchLocations,
  updateCategory,
  updateLocation,
} from "../api/catalog.js";

const MAX_CATEGORY_LEVEL = 3;
const MAX_LOCATION_LEVEL = 2;

export default function CatalogPage() {
  const [tab, setTab] = useState("categories");
  const [listingType, setListingType] = useState("give");

  // ---- Categories config ----
  const categoryLoadChildren = async (parent) => {
    const res = await fetchCategories({
      listingType,
      parentId: parent?.id,
    });
    return res.categories ?? [];
  };
  const categoryCanAddChild = (node) =>
    Boolean(node) && node.level < MAX_CATEGORY_LEVEL;

  // ---- Locations config ----
  const locationLoadChildren = async (parent) => {
    const res = await fetchLocations({ parentId: parent?.id });
    return res.locations ?? [];
  };
  const locationCanAddChild = (node) =>
    Boolean(node) && node.level < MAX_LOCATION_LEVEL;

  return (
    <div>
      <PageHeader
        title="Catalog"
        subtitle="Manage listing categories and pickup locations"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-surface-border bg-surface p-0.5 text-sm font-semibold">
          {[
            { id: "categories", label: "Categories" },
            { id: "locations", label: "Locations" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-4 py-1.5 transition ${
                tab === t.id ? "bg-primary text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "categories" ? (
          <div className="inline-flex rounded-lg border border-surface-border bg-surface p-0.5 text-sm font-semibold">
            {["give", "exchange"].map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => setListingType(lt)}
                className={`rounded-md px-4 py-1.5 capitalize transition ${
                  listingType === lt
                    ? "bg-primary-100 text-primary-700"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {lt}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="admin-card p-4">
        <p className="mb-3 text-xs text-ink-faint">
          Drill into a node to view and manage its children. Top-level{" "}
          {tab === "categories" ? "categories" : "divisions"} are seed-managed;
          you can add and toggle nodes beneath them.
        </p>

        {tab === "categories" ? (
          <TreeBrowser
            key={`cat-${listingType}`}
            rootKey={`cat-${listingType}`}
            loadChildren={categoryLoadChildren}
            canAddChild={categoryCanAddChild}
            onToggleActive={(node) =>
              updateCategory(node.id, { isActive: !node.isActive })
            }
            renderAddForm={({ parent, onDone }) => (
              <AddNodeForm
                onCreate={(payload) =>
                  createCategory({ ...payload, parentId: parent.id })
                }
                onDone={onDone}
              />
            )}
          />
        ) : (
          <TreeBrowser
            key="loc"
            rootKey="loc"
            loadChildren={locationLoadChildren}
            canAddChild={locationCanAddChild}
            onToggleActive={(node) =>
              updateLocation(node.id, { isActive: !node.isActive })
            }
            renderAddForm={({ parent, onDone }) => (
              <AddNodeForm
                requireCoords={parent.level + 1 === MAX_LOCATION_LEVEL}
                onCreate={(payload) =>
                  createLocation({ ...payload, parentId: parent.id })
                }
                onDone={onDone}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
