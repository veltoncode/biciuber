import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useTranslation } from "react-i18next";

// Define custom icons
const driverIcon = new L.DivIcon({
  html: `<div style="background-color: #F4C542; border: 2px solid #000; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 6px rgba(0,0,0,0.8);"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const passengerIcon = new L.DivIcon({
  html: `<div style="background-color: #fff; border: 2px solid #000; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 6px rgba(0,0,0,0.8);"></div>`,
  className: "",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Component to handle map view updates
function MapController({ driverLocation, passengerLocation, autoCenter, setAutoCenter }) {
  const map = useMap();

  useMapEvents({
    dragstart: () => {
      setAutoCenter(false);
    }
  });

  useEffect(() => {
    if (!autoCenter) return;
    
    if (driverLocation && passengerLocation) {
      const bounds = L.latLngBounds([
        [driverLocation.latitude, driverLocation.longitude],
        [passengerLocation.latitude, passengerLocation.longitude]
      ]);
      map.fitBounds(bounds, { padding: [30, 30] });
    } else if (driverLocation) {
      map.setView([driverLocation.latitude, driverLocation.longitude], 15);
    }
  }, [driverLocation, passengerLocation, map, autoCenter]);

  return null;
}

export default function RideMap({ driverLocation, pickupLat, pickupLng }) {
  const { t } = useTranslation();
  const [mapInstance, setMapInstance] = useState(null);
  const [autoCenter, setAutoCenter] = useState(true);

  if (!driverLocation) {
    return (
      <div style={{ height: 260, background: "rgba(255,255,255,0.05)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{t("waitingDriverLocation", { defaultValue: "Aguardando localização do bicitaxista..." })}</p>
      </div>
    );
  }

  const passengerLoc = (pickupLat && pickupLng) ? { latitude: pickupLat, longitude: pickupLng } : null;

  return (
    <div style={{ position: "relative", height: 260, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
      {/* Container com filtro para imitar um Dark Mode básico e não ofuscar a interface */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, filter: "brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)" }}>
        <MapContainer 
          center={[driverLocation.latitude, driverLocation.longitude]} 
          zoom={15} 
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          ref={setMapInstance}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[driverLocation.latitude, driverLocation.longitude]} icon={driverIcon} />
          {passengerLoc && (
            <Marker position={[passengerLoc.latitude, passengerLoc.longitude]} icon={passengerIcon} />
          )}
          <MapController driverLocation={driverLocation} passengerLocation={passengerLoc} autoCenter={autoCenter} setAutoCenter={setAutoCenter} />
        </MapContainer>
      </div>
      
      {!autoCenter && (
        <button 
          onClick={() => {
            if (mapInstance && driverLocation) {
              mapInstance.setView([driverLocation.latitude, driverLocation.longitude], 15);
              setAutoCenter(true);
            }
          }}
          style={{ 
            position: "absolute", 
            bottom: 12, 
            right: 12, 
            zIndex: 400, 
            background: "#F4C542", 
            color: "#000", 
            fontSize: 12, 
            padding: "8px 12px", 
            borderRadius: 8, 
            fontWeight: 700, 
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)"
          }}
        >
          {t("centerOnBicitaxi", { defaultValue: "Centralizar no bicitáxi" })}
        </button>
      )}
    </div>
  );
}
