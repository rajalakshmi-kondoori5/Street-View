// Copy to secrets.h (git-ignored) and fill in.
// The ESP32 holds NO Supabase key: it talks only to the Street View backend.
#pragma once
#define WIFI_SSID "your-wifi"
#define WIFI_PASSWORD "your-wifi-password"

// Backend base URL, no trailing slash (Render URL, or http://<your-PC-IP>:8080 for local testing)
#define API_URL "https://street-view-api.onrender.com"
// Must match this bin's entry in the backend's DEVICE_KEYS ("BIN-001:<this value>")
#define DEVICE_KEY "change-me-to-a-long-random-string"
#define BIN_ID "BIN-001"
