"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotatedmarker";        // extends L.Marker

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

export default function LiveMap({ lat, lon, hdg }: Props) {
  // keep map centered on the vehicle
  useEffect(() => {
    if (!isNaN(lat) && !isNaN(lon)) {
      map?.setView([lat, lon]);
    }
  }, [lat, lon]);

  // Leaflet objects must be created inside the component
  let map: L.Map | null = null;
  const saveRef = (m: L.Map) => (map = m);

  return (
    <MapContainer
      center={[lat, lon]}
      zoom={17}
      scrollWheelZoom
      style={{ height: "400px", width: "100%" }}
      whenCreated={saveRef}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
      />
      {/* @ts-ignore: rotated marker comes from plugin */}
      <Marker
        position={[lat, lon]}
        icon={triangle}
        rotationAngle={hdg}
        rotationOrigin="center"
      />
    </MapContainer>
  );
}
