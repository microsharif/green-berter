import { useCallback } from "react";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };

function PickupMarker({ position, readOnly, onDragEnd }) {
  const handleDragEnd = useCallback(
    (event) => {
      const latLng = event.latLng;
      if (!latLng) return;
      onDragEnd(latLng.lat(), latLng.lng());
    },
    [onDragEnd]
  );

  return (
    <Marker
      position={position}
      draggable={!readOnly}
      onDragEnd={readOnly ? undefined : handleDragEnd}
    />
  );
}

export function PickupMapCanvas({
  latitude,
  longitude,
  onCoordinatesChange,
  readOnly = false,
  compact = false,
  interactive = false,
  className = "",
}) {
  if (latitude == null || longitude == null) return null;

  const position = { lat: latitude, lng: longitude };
  const mapHeight = compact ? "h-40" : "h-64";
  const gestureHandling =
    readOnly && !interactive ? "none" : interactive ? "cooperative" : "greedy";

  return (
    <div
      className={`${mapHeight} w-full rounded-xl overflow-hidden ring-1 ring-inset ring-outline-variant/20 ${className}`}
    >
      <Map
        defaultCenter={position}
        center={position}
        defaultZoom={14}
        gestureHandling={gestureHandling}
        disableDefaultUI={compact}
        zoomControl={interactive || !readOnly}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={interactive}
      >
        <PickupMarker
          position={position}
          readOnly={readOnly}
          onDragEnd={onCoordinatesChange}
        />
      </Map>
    </div>
  );
}

function MissingMapsKeyMessage({ latitude, longitude }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Map unavailable</p>
      <p className="mt-1 text-amber-800/90">
        Set <code className="text-xs">VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
        <code className="text-xs">client/.env</code> to show the pickup map.
        Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </p>
    </div>
  );
}

/**
 * Map preview after an area is selected. Pin is draggable to fine-tune pickup.
 */
export default function PickupLocationMap({
  latitude,
  longitude,
  onCoordinatesChange,
  readOnly = false,
  compact = false,
  interactive = false,
  skipProvider = false,
  className = "",
}) {
  if (latitude == null || longitude == null) return null;

  if (!MAPS_KEY) {
    return (
      <MissingMapsKeyMessage latitude={latitude} longitude={longitude} />
    );
  }

  const map = (
    <PickupMapCanvas
      latitude={latitude}
      longitude={longitude}
      onCoordinatesChange={onCoordinatesChange}
      readOnly={readOnly}
      compact={compact}
      interactive={interactive}
      className={className}
    />
  );

  return (
    <div className="space-y-2">
      {!readOnly ? (
        <p className="text-xs text-on-surface-variant">
          Drag the pin to mark your exact pickup spot.
        </p>
      ) : null}
      {skipProvider ? map : <APIProvider apiKey={MAPS_KEY}>{map}</APIProvider>}
    </div>
  );
}

export { DEFAULT_CENTER, MAPS_KEY };
