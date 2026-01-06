#include <Arduino.h>
#include <DHT.h>

#define DHTPIN 27      // GPIO27 (D27)
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  delay(3000); // give Serial Monitor time to connect
  Serial.println("Starting DHT11 temperature/humidity read...");
  dht.begin();
}

void loop() {
  delay(2000); // DHT11 should not be read more often than every ~2s

  const unsigned long seconds = millis() / 1000;

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature(); // Celsius

  Serial.print("[");
  Serial.print(seconds);
  Serial.print("s] ");

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("DHT11 read error");
    return;
  }

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print(" C | Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
}