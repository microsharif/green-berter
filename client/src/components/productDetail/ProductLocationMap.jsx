import { useEffect, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { fetchLocationById } from "../../api/locations.js";
import PickupLocationMap, {
  MAPS_KEY,
} from "../upload/PickupLocationMap.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";

function MapLoadingPlaceholder() {
  return (
    <div
      className="h-80 w-full rounded-lg bg-surface-container-low ring-1 ring-inset ring-outline-variant/20 animate-pulse flex items-center justify-center"
      aria-busy="true"
      aria-label="Loading map"
    >
      <MaterialIcon
        name="progress_activity"
        className="text-3xl text-primary animate-spin"
      />
    </div>
  );
}

function useGeocodedCoords(address, enabled) {
  const geocodingLib = useMapsLibrary("geocoding");
  const [coords, setCoords] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !address?.trim()) {
      setCoords(null);
      setFailed(false);
      return;
    }
    if (!geocodingLib) return;

    let cancelled = false;
    setCoords(null);
    setFailed(false);

    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode({ address: address.trim() }, (results, status) => {
      if (cancelled) return;
      if (status === "OK" && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        setCoords({ latitude: loc.lat(), longitude: loc.lng() });
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [address, enabled, geocodingLib]);

  return { coords, failed, loading: enabled && !coords && !failed && !!geocodingLib };
}

function ProductLocationMapInner({ product }) {
  const locationLabel = product.location?.trim() || null;
  const [resolved, setResolved] = useState(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolveCoordinates() {
      setResolving(true);

      const pickupLat = product.pickupLatitude;
      const pickupLng = product.pickupLongitude;
      if (pickupLat != null && pickupLng != null) {
        if (!cancelled) {
          setResolved({ latitude: pickupLat, longitude: pickupLng });
          setResolving(false);
        }
        return;
      }

      if (product.areaId) {
        try {
          const { location, breadcrumb } = await fetchLocationById(product.areaId);
          const leaf = location ?? breadcrumb[breadcrumb.length - 1];
          if (
            leaf?.latitude != null &&
            leaf?.longitude != null &&
            !cancelled
          ) {
            setResolved({
              latitude: leaf.latitude,
              longitude: leaf.longitude,
            });
            setResolving(false);
            return;
          }
        } catch {
          /* fall through to geocoding */
        }
      }

      if (!cancelled) {
        setResolved(null);
        setResolving(false);
      }
    }

    resolveCoordinates();
    return () => {
      cancelled = true;
    };
  }, [
    product.areaId,
    product.pickupLatitude,
    product.pickupLongitude,
  ]);

  const needsGeocode = !resolving && !resolved && !!locationLabel;
  const { coords: geocoded, failed: geocodeFailed, loading: geocoding } =
    useGeocodedCoords(locationLabel, needsGeocode);

  const latitude = resolved?.latitude ?? geocoded?.latitude ?? null;
  const longitude = resolved?.longitude ?? geocoded?.longitude ?? null;
  const mapLoading = resolving || geocoding;

  if (!locationLabel && latitude == null) return null;

  return (
    <section className="mt-16 space-y-4">
      <h2 className="detail-section-heading font-headline text-xl font-bold text-on-surface md:text-2xl">
        Pickup location
      </h2>
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 md:p-8">
        {locationLabel ? (
          <p className="mb-4 flex items-center gap-2 text-on-surface-variant">
            <MaterialIcon
              name="location_on"
              className="text-lg text-primary shrink-0"
            />
            <span>{locationLabel}</span>
          </p>
        ) : null}

        {mapLoading ? <MapLoadingPlaceholder /> : null}

        {!mapLoading && latitude != null && longitude != null ? (
          <div className="h-80 overflow-hidden rounded-lg grayscale contrast-[0.9] transition-all duration-500 hover:grayscale-0">
            <PickupLocationMap
              latitude={latitude}
              longitude={longitude}
              readOnly
              interactive
              skipProvider
              className="!h-80"
            />
          </div>
        ) : null}

        {!mapLoading && latitude == null && geocodeFailed ? (
          <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low p-4 text-sm text-on-surface-variant">
            Map preview is unavailable for this location.
          </div>
        ) : null}

        {!MAPS_KEY && latitude != null ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Map unavailable</p>
            <p className="mt-1 text-amber-800/90">
              Add a Google Maps API key to show the pickup map.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function ProductLocationMap({ product }) {
  if (!product) return null;

  const hasLocation =
    product.location?.trim() ||
    product.pickupLatitude != null ||
    product.areaId;

  if (!hasLocation) return null;

  if (!MAPS_KEY) {
    return (
      <section className="mt-16 space-y-4">
        <h2 className="detail-section-heading font-headline text-xl font-bold text-on-surface md:text-2xl">
          Pickup location
        </h2>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 md:p-8">
          {product.location ? (
            <p className="mb-4 flex items-center gap-2 text-on-surface-variant">
              <MaterialIcon
                name="location_on"
                className="text-lg text-primary shrink-0"
              />
              <span>{product.location}</span>
            </p>
          ) : null}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Map unavailable</p>
            <p className="mt-1 text-amber-800/90">
              Set <code className="text-xs">VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
              <code className="text-xs">client/.env</code> to show the pickup map.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <APIProvider apiKey={MAPS_KEY}>
      <ProductLocationMapInner product={product} />
    </APIProvider>
  );
}
