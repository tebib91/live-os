"use client";

import { useCallback, useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/app/actions/settings";

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

interface UseUserLocationReturn {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  permissionStatus: PermissionState | null;
  requestLocation: () => void;
  setManualLocation: (location: UserLocation) => Promise<void>;
}

// Default location (San Francisco) as fallback
const DEFAULT_LOCATION: UserLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
  city: "San Francisco",
  country: "US",
};

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);

  // Request location from browser
  const requestLocationFromBrowser: () => void = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation not supported");
      setLocation(DEFAULT_LOCATION);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Try to get city name from reverse geocoding
        let city: string | undefined;
        let country: string | undefined;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "LiveOS Dashboard" } }
          );
          if (response.ok) {
            const data = await response.json();
            city = data.address?.city || data.address?.town || data.address?.village;
            country = data.address?.country_code?.toUpperCase();
          }
        } catch {
          // Reverse geocoding failed, continue without city name
        }

        const newLocation: UserLocation = { latitude, longitude, city, country };
        setLocation(newLocation);
        setLoading(false);

        // Save to settings
        try {
          await updateSettings({
            userLatitude: latitude,
            userLongitude: longitude,
            userCity: city ?? null,
            userCountry: country ?? null,
          });
        } catch (err) {
          console.warn("[Location] Failed to save location:", err);
        }
      },
      (err) => {
        console.warn("[Location] Geolocation error:", err.message);

        let errorMessage: string;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "Location permission denied";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable";
            break;
          case err.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
          default:
            errorMessage = "Failed to get location";
        }

        setError(errorMessage);
        setLocation(DEFAULT_LOCATION);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000, // Cache for 10 minutes
      }
    );
  }, []);

  // Check permission status
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;

    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
      })
      .catch(() => {
        // Permissions API not supported
      });
  }, []);

  // Load saved location from settings
  useEffect(() => {
    async function loadSavedLocation() {
      try {
        const settings = await getSettings();
        if (settings.userLatitude && settings.userLongitude) {
          setLocation({
            latitude: settings.userLatitude,
            longitude: settings.userLongitude,
            city: settings.userCity ?? undefined,
            country: settings.userCountry ?? undefined,
          });
          setLoading(false);
          return true;
        }
      } catch (err) {
        console.warn("[Location] Failed to load saved location:", err);
      }
      return false;
    }

    async function init() {
      const hasSaved = await loadSavedLocation();

      // If no saved location, try to get from browser
      if (!hasSaved) {
        requestLocationFromBrowser();
      }
    }

    init();
  }, []);

  // Manually set location
  const setManualLocation = useCallback(async (newLocation: UserLocation) => {
    setLocation(newLocation);
    setError(null);

    try {
      await updateSettings({
        userLatitude: newLocation.latitude,
        userLongitude: newLocation.longitude,
        userCity: newLocation.city ?? null,
        userCountry: newLocation.country ?? null,
      });
    } catch (err) {
      console.warn("[Location] Failed to save manual location:", err);
      throw err;
    }
  }, []);

  return {
    location,
    loading,
    error,
    permissionStatus,
    requestLocation: requestLocationFromBrowser,
    setManualLocation,
  };
}
