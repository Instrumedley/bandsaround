"use client";

import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { divIcon, type LatLngBoundsExpression } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { ConcertEvent } from "@/types/concert";

const EUROPE_BOUNDS: LatLngBoundsExpression = [
  [35.0, -11.0],
  [71.0, 31.5],
];

function makeBandPin(label: string) {
  return divIcon({
    className: "band-label-pin",
    html: `<span>${label}</span>`,
    iconSize: [100, 26],
    iconAnchor: [50, 13],
  });
}

type ConcertMapProps = {
  events: ConcertEvent[];
  shouldCluster: boolean;
};

export function ConcertMap({ events, shouldCluster }: ConcertMapProps) {
  return (
    <MapContainer
      bounds={EUROPE_BOUNDS}
      scrollWheelZoom
      className="h-[560px] w-full overflow-hidden rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {shouldCluster ? (
        <MarkerClusterGroup chunkedLoading>
          {events.map((event) => (
            <Marker key={event.id} position={[event.lat, event.lng]} icon={makeBandPin(event.artist)}>
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{event.artist}</p>
                  <p>{event.city}, {event.country}</p>
                  <p>{event.venue}</p>
                  <p>{event.date}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      ) : (
        events.map((event) => (
          <Marker key={event.id} position={[event.lat, event.lng]} icon={makeBandPin(event.artist)}>
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{event.artist}</p>
                <p>{event.city}, {event.country}</p>
                <p>{event.venue}</p>
                <p>{event.date}</p>
              </div>
            </Popup>
          </Marker>
        ))
      )}
    </MapContainer>
  );
}
