"use client";

import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

interface RoutePolylineProps {
  encodedPath: string;
  strokeColor?: string;
}

export default function RoutePolyline({ encodedPath, strokeColor = "#9306CF" }: RoutePolylineProps) {
  const map = useMap();
  const geometryLibrary = useMapsLibrary("geometry");
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !geometryLibrary || !encodedPath) return;

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        map,
        path: geometryLibrary.encoding.decodePath(encodedPath),
        strokeColor,
        strokeOpacity: 0.8,
        strokeWeight: 6,
        geodesic: true,
      });
    } else {
      polylineRef.current.setPath(geometryLibrary.encoding.decodePath(encodedPath));
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, geometryLibrary, encodedPath, strokeColor]);

  return null;
}
