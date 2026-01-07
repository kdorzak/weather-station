locals {
  weather_hostname = "weather.${data.cloudflare_zone.main.name}"
}

data "cloudflare_pages_project" "weather_dashboard" {
  account_id    = var.cloudflare_account_id
  project_name  = "weather-station-dashboard"
}

resource "cloudflare_dns_record" "weather" {
  zone_id = data.cloudflare_zone.main.id
  type    = "CNAME"
  name    = "weather"
  content = "${data.cloudflare_pages_project.weather_dashboard.subdomain}.pages.dev"
  proxied = false
  ttl     = 1
}

resource "cloudflare_pages_domain" "weather_dashboard" {
  account_id   = var.cloudflare_account_id
  project_name = data.cloudflare_pages_project.weather_dashboard.name

  name = local.weather_hostname

  # ensure DNS exists first
  depends_on = [cloudflare_dns_record.weather]
}