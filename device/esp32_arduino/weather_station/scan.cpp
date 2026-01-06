#include <Arduino.h>
#include <Wire.h>

#define I2C_SDA 21
#define I2C_SCL 22

static uint8_t readReg8(uint8_t addr, uint8_t reg) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return 0xFF; // repeated start
  if (Wire.requestFrom(addr, (uint8_t)1) != 1) return 0xFF;
  return Wire.read();
}

static void printHex8(uint8_t v) {
  if (v < 16) Serial.print("0");
  Serial.print(v, HEX);
}

static void scanOnce(bool probeIds = true) {
  uint8_t foundAddrs[32];
  uint8_t foundCount = 0;

  // 1) Scan for ACKed addresses
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    uint8_t err = Wire.endTransmission();
    if (err == 0) {
      if (foundCount < sizeof(foundAddrs)) {
        foundAddrs[foundCount++] = addr;
      }
    }
  }

  // 2) Print a compact list of found addresses
  Serial.print("I2C addresses found (");
  Serial.print(foundCount);
  Serial.print("): ");

  if (foundCount == 0) {
    Serial.println("none");
    Serial.println();
    return;
  }

  for (uint8_t i = 0; i < foundCount; i++) {
    Serial.print("0x");
    printHex8(foundAddrs[i]);
    if (i + 1 < foundCount) Serial.print(", ");
  }
  Serial.println();

  // 3) Optional: probe common ID registers for each address
  if (probeIds) {
    for (uint8_t i = 0; i < foundCount; i++) {
      uint8_t addr = foundAddrs[i];

      Serial.print("Device 0x");
      printHex8(addr);
      Serial.println(" ID probe:");

      uint8_t idD0 = readReg8(addr, 0xD0); // Bosch chip ID register
      uint8_t id00 = readReg8(addr, 0x00);
      uint8_t id0F = readReg8(addr, 0x0F);

      Serial.print("  reg 0xD0 = 0x"); printHex8(idD0); Serial.println();
      Serial.print("  reg 0x00 = 0x"); printHex8(id00); Serial.println();
      Serial.print("  reg 0x0F = 0x"); printHex8(id0F); Serial.println();
    }
  }

  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(3000); // give Serial Monitor time to connect
  Serial.println("Starting periodic I2C scanner...");

  Wire.begin(I2C_SDA, I2C_SCL);

  // Prevent hangs if the bus gets wedged
  Wire.setTimeOut(50);
}

void loop() {
  scanOnce(true);   // set to false if you only want the address list
  delay(5000);
}