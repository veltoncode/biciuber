import React, { useEffect, useState, useMemo } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useTranslation } from "react-i18next";

// Coordenadas padrão de Afuá - PA
const AFUA_CENTER = { lat: -0.1566, lng: -50.3867 };

// Helper para obter o ícone do bicitáxi com SVG customizado (amarelo e preto)
const getDriverIcon = () => {
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="14" fill="#F4C542" stroke="#000000" stroke-width="2.5"/>
      <circle cx="18" cy="18" r="5" fill="#000000"/>
    </svg>
  `)}`;

  if (typeof window !== "undefined" && window.google?.maps?.Size && window.google?.maps?.Point) {
    return {
      url,
      scaledSize: new window.google.maps.Size(36, 36),
      anchor: new window.google.maps.Point(18, 18)
    };
  }
  return { url };
};

// Helper para obter o ícone do passageiro / ponto de embarque (verde e branco)
const getPassengerIcon = () => {
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="12" fill="#18C978" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="4.5" fill="#ffffff"/>
    </svg>
  `)}`;

  if (typeof window !== "undefined" && window.google?.maps?.Size && window.google?.maps?.Point) {
    return {
      url,
      scaledSize: new window.google.maps.Size(32, 32),
      anchor: new window.google.maps.Point(16, 16)
    };
  }
  return { url };
};

// Helper para extrair latitude e longitude em qualquer formato/aninhamento
function extractCoords(source) {
  if (!source) return null;
  if (Array.isArray(source) && source.length >= 2) {
    const lat = Number(source[0]);
    const lng = Number(source[1]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  const obj = source.payload || source;
  const lat = obj.latitude ?? obj.lat;
  const lng = obj.longitude ?? obj.lng;
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
}

// Componente para controlar visualização reativa (enquadramento e auto-center)
function MapController({ driverPos, passengerPos, autoCenter, setAutoCenter }) {
  const map = useMap();

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

  // Enquadramento reativo: segue o bicitáxi ou passengerPos ou mantém Afuá com zoom 16
  useEffect(() => {
    if (!map || !autoCenter) return;

    if (driverPos) {
      map.panTo(driverPos);
      if (map.getZoom() !== 16) {
        map.setZoom(16);
      }
    } else if (passengerPos) {
      map.panTo(passengerPos);
      if (map.getZoom() !== 16) {
        map.setZoom(16);
      }
    } else {
      map.panTo(AFUA_CENTER);
      if (map.getZoom() !== 16) {
        map.setZoom(16);
      }
    }
  }, [map, driverPos, passengerPos, autoCenter]);

  return null;
}

// Conteúdo interno do mapa que consome o contexto de APIProvider
function RideMapContent({
  driverLocation,
  pickupLat,
  pickupLng,
  passengerLocation,
  origin,
  pickupLocation,
  ...rest
}) {
  const { t } = useTranslation();
  const map = useMap();
  const [autoCenter, setAutoCenter] = useState(true);

  // Normalização segura das coordenadas do motorista (procura em todos os níveis possíveis, incluindo payload)
  const driverPos = useMemo(() => {
    if (rest.driverPos && !isNaN(Number(rest.driverPos.lat)) && !isNaN(Number(rest.driverPos.lng))) {
      return { lat: Number(rest.driverPos.lat), lng: Number(rest.driverPos.lng) };
    }
    const fromDriverLoc = extractCoords(driverLocation);
    if (fromDriverLoc) return fromDriverLoc;

    const fromDriver = extractCoords(rest.driver);
    if (fromDriver) return fromDriver;

    return null;
  }, [rest.driverPos, driverLocation, rest.driver]);

  // Extração flexível e segura da localização do passageiro (como passengerLocation, origin, pickupLat/pickupLng, pickupLocation)
  const passengerPos = useMemo(() => {
    if (rest.passengerPos && !isNaN(Number(rest.passengerPos.lat)) && !isNaN(Number(rest.passengerPos.lng))) {
      return { lat: Number(rest.passengerPos.lat), lng: Number(rest.passengerPos.lng) };
    }
    const fromPassengerLoc = extractCoords(passengerLocation);
    if (fromPassengerLoc) return fromPassengerLoc;

    const fromOrigin = extractCoords(origin);
    if (fromOrigin) return fromOrigin;

    const fromPickupLoc = extractCoords(pickupLocation);
    if (fromPickupLoc) return fromPickupLoc;

    if (pickupLat != null && pickupLng != null && !isNaN(Number(pickupLat)) && !isNaN(Number(pickupLng))) {
      return { lat: Number(pickupLat), lng: Number(pickupLng) };
    }

    return null;
  }, [rest.passengerPos, passengerLocation, origin, pickupLocation, pickupLat, pickupLng]);

  // Ícones customizados caso a API do Google esteja pronta, ou fallback seguro
  const driverIcon = useMemo(() => getDriverIcon(), [map]);
  const passengerIcon = useMemo(() => getPassengerIcon(), [map]);

  return (
    <div
      style={{
        width: "100%",
        height: "500px",
        minHeight: "500px",
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
      >
        {passengerPos && (
          <Marker
            position={passengerPos}
            title={t("yourLocation", { defaultValue: "Sua Localização" })}
            icon={passengerIcon || undefined}
          />
        )}

        {driverPos && (
          <Marker
            position={driverPos}
            title={t("driverTitle", { defaultValue: "Bicitaxista" })}
            icon={driverIcon || undefined}
          />
        )}

        <MapController
          driverPos={driverPos}
          passengerPos={passengerPos}
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
export default function RideMap(props) {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
    "";

  return (
    <APIProvider apiKey={apiKey}>
      <RideMapContent {...props} />
    </APIProvider>
  );
}
