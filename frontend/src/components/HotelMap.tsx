"use client";

import { useEffect, useRef, useState } from "react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

interface Props {
  lat: number | null;
  lng: number | null;
  editable?: boolean;
  height?: number | string;
  onChange?: (lat: number, lng: number) => void;
}

export default function HotelMap({ lat, lng, editable = false, height = 360, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Using `unknown` so we don't depend on Leaflet types at module scope (dynamic import)
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);

  // Inject Leaflet CSS once
  useEffect(() => {
    if (typeof document === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
    if (document.querySelector(`link[data-leaflet]`)) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    link.dataset.leaflet = "1";
    link.onload = () => setReady(true);
    document.head.appendChild(link);
  }, []);

  // Initialize map once CSS is ready
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      // Default Leaflet marker icons reference assets via relative paths that don't resolve
      // in Next.js bundlers. Point them at the official CDN.
      const iconUrl       = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
      const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
      const shadowUrl     = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
      const DefaultIcon = L.icon({
        iconUrl, iconRetinaUrl, shadowUrl,
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      const initialLat = lat ?? 24.7136;   // default: Riyadh
      const initialLng = lng ?? 46.6753;
      const map = L.map(containerRef.current).setView([initialLat, initialLng], lat != null && lng != null ? 15 : 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);

      if (lat != null && lng != null) {
        markerRef.current = L.marker([lat, lng], { draggable: editable }).addTo(map);
      }

      if (editable) {
        const setMarker = (la: number, ln: number) => {
          const m = markerRef.current as L.Marker | null;
          if (m) {
            m.setLatLng([la, ln]);
          } else {
            markerRef.current = L.marker([la, ln], { draggable: true }).addTo(map);
            (markerRef.current as L.Marker).on("dragend", (ev) => {
              const ll = (ev.target as L.Marker).getLatLng();
              onChange?.(Number(ll.lat.toFixed(7)), Number(ll.lng.toFixed(7)));
            });
          }
          onChange?.(Number(la.toFixed(7)), Number(ln.toFixed(7)));
        };
        map.on("click", (e) => {
          setMarker(e.latlng.lat, e.latlng.lng);
        });
        const m = markerRef.current as L.Marker | null;
        if (m) {
          m.on("dragend", (ev) => {
            const ll = (ev.target as L.Marker).getLatLng();
            onChange?.(Number(ll.lat.toFixed(7)), Number(ll.lng.toFixed(7)));
          });
        }
      }

      mapRef.current = map;
      // Workaround for tiles not rendering correctly inside flex/grid containers
      setTimeout(() => map.invalidateSize(), 0);
    })();
    return () => { cancelled = true; };
  }, [ready, editable, lat, lng, onChange]);

  // Re-center map when external lat/lng change (e.g. via geolocation button)
  useEffect(() => {
    (async () => {
      if (!mapRef.current || lat == null || lng == null) return;
      const L = await import("leaflet");
      const map = mapRef.current as L.Map;
      map.setView([lat, lng], 15);
      const m = markerRef.current as L.Marker | null;
      if (m) {
        m.setLatLng([lat, lng]);
      } else {
        const newM = L.marker([lat, lng], { draggable: editable }).addTo(map);
        if (editable) {
          newM.on("dragend", (ev) => {
            const ll = (ev.target as L.Marker).getLatLng();
            onChange?.(Number(ll.lat.toFixed(7)), Number(ll.lng.toFixed(7)));
          });
        }
        markerRef.current = newM;
      }
    })();
  }, [lat, lng, editable, onChange]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: "100%",
        borderRadius: "0.5rem",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
      }}
    />
  );
}
