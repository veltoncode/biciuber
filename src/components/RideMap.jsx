import React, { useEffect, useState, useMemo } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useTranslation } from "react-i18next";

// Coordenadas padrão de Afuá - PA
const AFUA_CENTER = { lat: -0.1566, lng: -50.3867 };

// Estilos Solarpunk estáveis para o mapa (substitui o colorScheme="DARK" nativo)
const solarpunkStyles = [
  { elementType: "geometry", stylers: [{ color: "#1b2c24" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#10251d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b0" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d4a3e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#f4ebdd" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1b14" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
];

const mapOptions = {
  styles: solarpunkStyles,
  disableDefaultUI: true
};

// Helper para obter o ícone do bicitáxi com SVG customizado (amarelo e preto)
const getDriverIcon = () => {
  if (typeof window !== "undefined" && window.google?.maps?.Size && window.google?.maps?.Point) {
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="#F4C542" stroke="#000000" stroke-width="2.5"/>
          <circle cx="18" cy="18" r="5" fill="#000000"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(36, 36),
      anchor: new window.google.maps.Point(18, 18)
    };
  }
  return undefined;
};

// Helper para obter o ícone do passageiro / ponto de embarque (verde e branco)
const getPassengerIcon = () => {
  if (typeof window !== "undefined" && window.google?.maps?.Size && window.google?.maps?.Point) {
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="#18C978" stroke="#ffffff" stroke-width="2.5"/>
          <circle cx="16" cy="16" r="4.5" fill="#ffffff"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(32, 32),
      anchor: new window.google.maps.Point(16, 16)
    };
  }
  return undefined;
};

// Componente para controlar visualização reativa (enquadramento e auto-center)
function MapController({ driverPos, autoCenter, setAutoCenter }) {
  const map = useMap();

  // Aplica explicitamente as opções de estilo do mapa quando o mapa estiver pronto
  useEffect(() => {
    if (!map) return;
    map.setOptions(mapOptions);
  }, [map]);

  // Desativa autoCenter se o usuário arrastar o mapa manualmente
  useEffect(() => {
    if (!map) return;

    const listener = map.addListener("dragstart", () => {
      setAutoCenter(false);
    });

    return () => {
      if (listener && typeof listener.remove === "function") {
        listener.remove();
      } else if (typeof window !== "undefined" && window.google?.maps?.event?.removeListener) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [map, setAutoCenter]);

  // Enquadramento reativo: segue o bicitáxi ou mantém Afuá com zoom 16
  useEffect(() => {
    if (!map || !autoCenter) return;

    if (driverPos) {
      map.panTo(driverPos);
      if (map.getZoom() !== 16) {
        map.setZoom(16);
      }
    } else {
      map.panTo(AFUA_CENTER);
      if (map.getZoom() !== 16) {
        map.setZoom(16);
      }
    }
  }, [map, driverPos, autoCenter]);

  return null;
}

// Conteúdo interno do mapa que consome o contexto de APIProvider
function RideMapContent({ driverLocation, pickupLat, pickupLng }) {
  const { t } = useTranslation();
  const map = useMap();
  const [autoCenter, setAutoCenter] = useState(true);

  // Normalização segura das coordenadas do motorista (latitude/longitude ou lat/lng)
  const lat = driverLocation?.latitude ?? driverLocation?.lat;
  const lng = driverLocation?.longitude ?? driverLocation?.lng;
  const driverPos = (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng)))
    ? { lat: Number(lat), lng: Number(lng) }
    : null;

  // Normalização segura das coordenadas do passageiro
  const pLat = pickupLat;
  const pLng = pickupLng;
  const passengerPos =
    pLat != null && pLng != null && !isNaN(Number(pLat)) && !isNaN(Number(pLng))
      ? { lat: Number(pLat), lng: Number(pLng) }
      : null;

  return (
    <div
      style={{
        width: "100%",
        height: "400px",
        minHeight: "400px",
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}
    >
      <Map
        defaultCenter={AFUA_CENTER}
        defaultZoom={16}
        gestureHandling="greedy"
        disableDefaultUI={true}
        style={{ width: "100%", height: "100%" }}
        styles={solarpunkStyles}
        options={mapOptions}
      >
        {passengerPos && (
          <Marker
            position={passengerPos}
            title={t("pickupPoint", { defaultValue: "Ponto de Partida" })}
            icon={getPassengerIcon()}
          />
        )}

        {driverPos && (
          <Marker
            position={driverPos}
            title={t("driverLocationTitle", { defaultValue: "Bicitáxi em tempo real" })}
            icon={getDriverIcon()}
          />
        )}

        <MapController
          driverPos={driverPos}
          autoCenter={autoCenter}
          setAutoCenter={setAutoCenter}
        />
      </Map>

      {!driverPos && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            background: "rgba(16, 37, 29, 0.88)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "#F4EBDD",
            fontSize: 12,
            padding: "6px 14px",
            borderRadius: 20,
            border: "1px solid rgba(24, 201, 120, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#F4C542",
              boxShadow: "0 0 6px #F4C542"
            }}
          />
          <span>{t("waitingDriverLocation", { defaultValue: "Aguardando localização do bicitaxista..." })}</span>
        </div>
      )}

      {!autoCenter && driverPos && (
        <button
          onClick={() => {
            if (map && driverPos) {
              map.panTo(driverPos);
              map.setZoom(16);
            }
            setAutoCenter(true);
          }}
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            zIndex: 10,
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

// Componente principal envolvido com APIProvider
export default function RideMap({ driverLocation, pickupLat, pickupLng }) {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
    "";

  return (
    <APIProvider apiKey={apiKey}>
      <RideMapContent
        driverLocation={driverLocation}
        pickupLat={pickupLat}
        pickupLng={pickupLng}
      />
    </APIProvider>
  );
}
