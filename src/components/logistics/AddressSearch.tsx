"use client";

import { useEffect, useState, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import styles from "./AddressSearch.module.css";

interface AddressSearchProps {
  onPlaceSelected: (location: google.maps.LatLngLiteral, address: string) => void;
  placeholder?: string;
}

export default function AddressSearch({ onPlaceSelected, placeholder = "Buscar endereço de entrega..." }: AddressSearchProps) {
  const placesLibrary = useMapsLibrary("places");
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize Session Token
  useEffect(() => {
    if (!placesLibrary) return;
    setSessionToken(new placesLibrary.AutocompleteSessionToken());
  }, [placesLibrary]);

  const handleInputChange = async (value: string) => {
    setInput(value);
    if (!placesLibrary || !sessionToken || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const request = {
        input: value,
        sessionToken: sessionToken,
        language: "pt-BR",
        region: "br",
      };
      
      const response = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      setSuggestions(response.suggestions);
    } catch (e) {
      console.error("Error fetching suggestions:", e);
      setSuggestions([]);
    }
  };

  const handleSelect = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLibrary || !sessionToken) return;
    
    // Clear suggestions
    setSuggestions([]);
    
    try {
      const place = suggestion.placePrediction?.toPlace();
      if (!place) return;

      // Fetch the geometry using the same session token to avoid extra billing
      await place.fetchFields({
        fields: ["location", "displayName", "formattedAddress"],
      });

      const location = place.location;
      if (location) {
        const latLng = { lat: location.lat(), lng: location.lng() };
        const address = place.formattedAddress || place.displayName || input;
        setInput(address);
        onPlaceSelected(latLng, address);
        
        // Refresh token for next search
        setSessionToken(new placesLibrary.AutocompleteSessionToken());
      }
    } catch (e) {
      console.error("Error fetching place details:", e);
    }
  };

  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        className={styles.input}
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
      />
      {suggestions.length > 0 && (
        <div className={styles.dropdown} ref={dropdownRef}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={styles.suggestionItem}
              onClick={() => handleSelect(s)}
            >
              {s.placePrediction?.text.toString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
