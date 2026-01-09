// Weather alerts module - separated from open-meteo.ts

export type AlertSeverity = "minor" | "moderate" | "severe" | "extreme";

export interface MeteoAlarmAlert {
  id: string;
  title: string;
  event: string;
  severity: AlertSeverity;
  certainty: string;
  urgency: string;
  areaDesc: string;
  onset: string;
  expires: string;
  effective: string;
  description?: string;
  instruction?: string;
  color: string;
  bgColor: string;
  icon: string;
}

const SEVERITY_COLORS: Record<AlertSeverity, { color: string; bgColor: string }> = {
  minor: { color: "#ca8a04", bgColor: "#fef9c3" },
  moderate: { color: "#ea580c", bgColor: "#fed7aa" },
  severe: { color: "#dc2626", bgColor: "#fecaca" },
  extreme: { color: "#7f1d1d", bgColor: "#ef4444" },
};

const EVENT_ICONS: Record<string, string> = {
  wind: "💨",
  rain: "🌧️",
  snow: "❄️",
  thunderstorm: "⛈️",
  fog: "🌫️",
  heat: "🔥",
  cold: "🥶",
  ice: "🧊",
  flood: "🌊",
  avalanche: "⛰️",
  default: "⚠️",
};

function getEventIcon(event: string): string {
  const eventLower = event.toLowerCase();
  if (eventLower.includes("wind") || eventLower.includes("wiatr")) return EVENT_ICONS.wind;
  if (eventLower.includes("rain") || eventLower.includes("deszcz") || eventLower.includes("opady")) return EVENT_ICONS.rain;
  if (eventLower.includes("snow") || eventLower.includes("śnieg")) return EVENT_ICONS.snow;
  if (eventLower.includes("thunder") || eventLower.includes("burz")) return EVENT_ICONS.thunderstorm;
  if (eventLower.includes("fog") || eventLower.includes("mgł")) return EVENT_ICONS.fog;
  if (eventLower.includes("heat") || eventLower.includes("upał")) return EVENT_ICONS.heat;
  if (eventLower.includes("cold") || eventLower.includes("mróz") || eventLower.includes("temperature")) return EVENT_ICONS.cold;
  if (eventLower.includes("ice") || eventLower.includes("lód") || eventLower.includes("gołoledź")) return EVENT_ICONS.ice;
  if (eventLower.includes("flood") || eventLower.includes("powódź")) return EVENT_ICONS.flood;
  if (eventLower.includes("avalanche") || eventLower.includes("lawina")) return EVENT_ICONS.avalanche;
  return EVENT_ICONS.default;
}

function mapSeverityToLevel(capSeverity: string): AlertSeverity {
  const sev = capSeverity.toLowerCase();
  if (sev === "extreme") return "extreme";
  if (sev === "severe") return "severe";
  if (sev === "moderate") return "moderate";
  return "minor";
}

export async function fetchMeteoAlarmAlerts(country: string = "poland"): Promise<MeteoAlarmAlert[]> {
  try {
    const response = await fetch(`https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-${country}`);
    
    if (!response.ok) {
      console.error(`MeteoAlarm API error: ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const entries = xmlDoc.querySelectorAll("entry");
    const alerts: MeteoAlarmAlert[] = [];
    
    entries.forEach((entry) => {
      const id = entry.querySelector("id")?.textContent || "";
      const title = entry.querySelector("title")?.textContent || "";
      const event = entry.querySelector("cap\\:event, event")?.textContent || "";
      const areaDesc = entry.querySelector("cap\\:areaDesc, areaDesc")?.textContent || "";
      const severity = entry.querySelector("cap\\:severity, severity")?.textContent || "Minor";
      const certainty = entry.querySelector("cap\\:certainty, certainty")?.textContent || "";
      const urgency = entry.querySelector("cap\\:urgency, urgency")?.textContent || "";
      const onset = entry.querySelector("cap\\:onset, onset")?.textContent || "";
      const expires = entry.querySelector("cap\\:expires, expires")?.textContent || "";
      const effective = entry.querySelector("cap\\:effective, effective")?.textContent || "";
      
      const severityLevel = mapSeverityToLevel(severity);
      const colors = SEVERITY_COLORS[severityLevel];
      const icon = getEventIcon(event);
      
      alerts.push({
        id,
        title,
        event,
        severity: severityLevel,
        certainty,
        urgency,
        areaDesc,
        onset,
        expires,
        effective,
        ...colors,
        icon,
      });
    });
    
    // Sort by severity (most severe first)
    const severityOrder: Record<AlertSeverity, number> = {
      extreme: 0,
      severe: 1,
      moderate: 2,
      minor: 3,
    };
    
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  } catch (error) {
    console.error("Error fetching MeteoAlarm alerts:", error);
    return [];
  }
}

// Alert filtering utilities
export function filterActiveAlerts(alerts: MeteoAlarmAlert[]): MeteoAlarmAlert[] {
  const now = new Date();
  return alerts.filter(alert => {
    const expiresDate = new Date(alert.expires);
    const effectiveDate = new Date(alert.effective);
    return now >= effectiveDate && now <= expiresDate;
  });
}

export function filterAlertsByRegion(alerts: MeteoAlarmAlert[], region: string): MeteoAlarmAlert[] {
  const regionLower = region.toLowerCase();
  return alerts.filter(alert => 
    alert.areaDesc.toLowerCase().includes(regionLower)
  );
}

export function filterAlertsBySeverity(alerts: MeteoAlarmAlert[], severity: AlertSeverity): MeteoAlarmAlert[] {
  return alerts.filter(alert => alert.severity === severity);
}

export function getAlertCountBySeverity(alerts: MeteoAlarmAlert[]): Record<AlertSeverity, number> {
  return alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<AlertSeverity, number>);
}

export function isAlertExpired(alert: MeteoAlarmAlert): boolean {
  return new Date(alert.expires) < new Date();
}

export function isAlertActive(alert: MeteoAlarmAlert): boolean {
  const now = new Date();
  const effectiveDate = new Date(alert.effective);
  const expiresDate = new Date(alert.expires);
  return now >= effectiveDate && now <= expiresDate;
}

export function formatAlertDuration(alert: MeteoAlarmAlert): string {
  const onset = new Date(alert.onset);
  const expires = new Date(alert.expires);
  const now = new Date();
  
  if (now < onset) {
    // Alert hasn't started yet
    const hoursUntilOnset = Math.round((onset.getTime() - now.getTime()) / (1000 * 60 * 60));
    return `Starts in ${hoursUntilOnset}h`;
  } else if (now > expires) {
    // Alert has expired
    return "Expired";
  } else {
    // Alert is active
    const hoursUntilExpires = Math.round((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (hoursUntilExpires <= 1) {
      return "Expires soon";
    }
    return `${hoursUntilExpires}h remaining`;
  }
}
