# Weather Station

A modular weather station project aimed at building a functional and cost-effective system for weather monitoring. The project includes various components such as firmware for microcontrollers, backend API, web application, and infrastructure as code, all organized within a single monorepo.

---

## 🎯 Project Goal

The goal of the project is to create a weather station that is:
- affordable to build and maintain,
- functionally extensible,
- based on well-considered architectural decisions,
- scalable and allowing gradual expansion.

The project follows an iterative development approach, with the possibility to refine requirements and scope in subsequent phases.

---

## 📂 Repository Structure

```
weather_station/
├── docs/               # Shared documentation (business, architecture, contracts)
├── services/
│   └── api/            # Backend API (Cloudflare Worker)
├── apps/
│   └── web/            # Frontend (Next.js)
├── device/
│   └── esp32_arduino/  # Firmware (ESP32 / Arduino)
├── infra/
│   └── terraform/      # Infrastructure as Code
├── db/
│   └── migrations/     # SQL migrations
└── README.md           # (this file)
```

---

## 📘 Documentation

The project documentation is divided into two main parts:

- Shared documentation, covering topics related to the entire system such as vision, architecture, contracts, and design decisions. This is located in a dedicated directory within the repository.

- Component-specific documentation, containing details about individual modules and services. Each component has its own directory with documentation to facilitate understanding and development of that part of the system.