"use client";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotatedmarker";        // extends L.Marker

// Extend the Marker type to include rotation methods
declare module 'leaflet' {
  interface Marker {
    setRotationAngle(angle: number): void;
  }
}

/* triangular SVG icon */
const triangle = new L.DivIcon({
  className: "",
  html: `<svg width="28" height="28" viewBox="0 0 100 100"
              style="transform: translate(-50%, -50%);">
           <polygon points="50,0 0,100 100,100" fill="#00aaff"/>
         </svg>`,
});

type Props = {
  lat: number;
  lon: number;
  hdg: number;          // degrees
};

type RotatedMarkerProps = {
  lat: number;
  lon: number;
  hdg: number;
  icon: L.DivIcon;
};

export function RotatedMarker({ lat, lon, hdg, icon }: RotatedMarkerProps) {
  const markerRef = useRef<L.Marker>(null);
  const map = useMap();

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setRotationAngle(hdg);
    }
  }, [hdg]);

  useEffect(() => {
    map.setView([lat, lon]);
  }, [lat, lon, map]);

  return (
    <Marker
      position={[lat, lon]}
      icon={icon}
      ref={markerRef}
    />
  );
}

export default function LiveMap({ lat, lon, hdg }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!isNaN(lat) && !isNaN(lon)) {
      mapRef.current?.setView([lat, lon]);
    }
  }, [lat, lon]);

  return (
    <MapContainer
      center={[lat, lon]}
      zoom={17}
      scrollWheelZoom
      style={{ height: "400px", width: "100%" }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={mapRef as any}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
      />
      <RotatedMarker lat={lat} lon={lon} hdg={hdg} icon={triangle} />
    </MapContainer>
  );
}
