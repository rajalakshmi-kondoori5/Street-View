/*
  Street View — Smart Bin node (ESP32 + HC-SR04)

  Job of this device: MEASURE and REPORT only.
    HC-SR04 distance -> fill %  -> HTTPS POST to the Street View backend (Render),
    which verifies DEVICE_KEY and updates this BIN_ID's row in Supabase.
  All route optimisation / alert logic runs in the dashboard and backend, NOT here.
  The server sets Status and Last Updated, so the ESP32 needs no clock.

  Wiring (HC-SR04 is 5 V; use a divider on ECHO: 1k from ECHO, 2k to GND -> 3.3 V to the ESP32):
    VCC  -> 5V (VIN)      GND  -> GND
    TRIG -> GPIO 5        ECHO -> GPIO 18 (through the divider)

  Setup:
    1. Copy secrets.example.h to secrets.h and fill it in (secrets.h is git-ignored).
    2. Insert a row in `bins` for this BIN_ID with Address/Latitude/Longitude (the device only updates it).
    3. Board: "ESP32 Dev Module". Libraries: built-in WiFi, HTTPClient, WiFiClientSecure.
*/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "secrets.h"

// ---- hardware ----
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

// ---- bin geometry (measure your bin!) ----
const float BIN_EMPTY_CM = 80.0;  // sensor -> bottom when empty
const float BIN_FULL_CM  = 5.0;   // sensor -> rubbish when completely full

// ---- reporting ----
const unsigned long REPORT_EVERY_MS = 30000;  // regular report
const float REPORT_ON_CHANGE_PCT = 5.0;       // or sooner when fill changes this much

float lastSentFill = -100;
unsigned long lastSentAt = 0;

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long us = pulseIn(ECHO_PIN, HIGH, 30000);  // 30 ms timeout (~5 m)
  if (us == 0) return -1;
  return us * 0.0343 / 2.0;
}

// Median of 7 readings to reject ultrasonic glitches.
float readDistanceMedian() {
  float v[7];
  int n = 0;
  for (int i = 0; i < 7; i++) {
    float d = readDistanceCm();
    if (d > 0) v[n++] = d;
    delay(60);
  }
  if (n == 0) return -1;
  for (int i = 1; i < n; i++) {
    float key = v[i];
    int j = i - 1;
    while (j >= 0 && v[j] > key) { v[j + 1] = v[j]; j--; }
    v[j + 1] = key;
  }
  return v[n / 2];
}

float distanceToFill(float cm) {
  float pct = (BIN_EMPTY_CM - cm) / (BIN_EMPTY_CM - BIN_FULL_CM) * 100.0;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return roundf(pct);
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500);
    Serial.print('.');
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " FAILED");
}

bool sendFill(float fill) {
  WiFiClientSecure client;
  client.setInsecure();  // demo only; for production use client.setCACert(<root CA of your API host>)
  HTTPClient http;
  http.setTimeout(60000);  // Render free tier can take ~50 s to wake up

  // POST to the Street View backend; it checks DEVICE_KEY and writes to Supabase server-side.
  String url = String(API_URL) + "/api/bins/" + BIN_ID + "/reading";
  if (!http.begin(client, url)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  String body = String("{\"fillLevel\":") + String(fill, 0) + "}";
  int code = http.POST(body);
  String resp = http.getString();
  http.end();

  if (code == 200) {
    Serial.printf("Sent %s = %.0f%%\n", BIN_ID, fill);
    return true;
  }
  if (code == 401) Serial.println("401: DEVICE_KEY does not match DEVICE_KEYS on the server for this BIN_ID.");
  else if (code == 404) Serial.println("404: BIN_ID has no row in the bins table. Add it in Supabase first.");
  else if (code == 429) Serial.println("429: sending too often; slow down.");
  else Serial.printf("POST failed %d: %s\n", code, resp.c_str());
  return false;
}
void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  connectWifi();
}

void loop() {
  float cm = readDistanceMedian();
  if (cm < 0) {
    Serial.println("HC-SR04: no echo");
    delay(2000);
    return;
  }
  float fill = distanceToFill(cm);
  Serial.printf("distance %.1f cm -> fill %.0f%%\n", cm, fill);

  bool due = millis() - lastSentAt >= REPORT_EVERY_MS;
  bool changed = fabs(fill - lastSentFill) >= REPORT_ON_CHANGE_PCT;
  if (due || changed) {
    connectWifi();
    if (WiFi.status() == WL_CONNECTED && sendFill(fill)) {
      lastSentFill = fill;
      lastSentAt = millis();
    }
  }
  delay(2000);
}
