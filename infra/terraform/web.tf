########################################
# Inputs
########################################

variable "zone_name" {
  type    = string
  default = "kdorzak.online"
}

variable "pages_project_name" {
  type    = string
  default = "weather-station"
}

locals {
  weather_hostname = "weather.${var.zone_name}"
}

########################################
# Zone lookup (v5 compatible)
########################################

data "cloudflare_zone" "zone" {
  filter = {
    name = var.zone_name
  }
}

data "cloudflare_pages_project" "web" {
  account_id    = var.cloudflare_account_id
  project_name  = var.pages_project_name
}
########################################
# DNS record for Pages custom domain
# (Pages will NOT create DNS record automatically)
########################################

resource "cloudflare_dns_record" "weather" {
  zone_id  = data.cloudflare_zone.zone.id
  name     = "weather"
  type     = "CNAME"
  content  = "${data.cloudflare_pages_project.web.subdomain}.pages.dev"
  proxied  = true
  ttl      = 1 # auto
}

########################################
# Attach custom domain to Pages project
########################################

resource "cloudflare_pages_domain" "weather" {
  account_id   = var.cloudflare_account_id
  project_name = var.pages_project_name

  # v5 uses "name" as the hostname
  name = local.weather_hostname

  # ensure DNS exists first
  depends_on = [cloudflare_dns_record.weather]
}