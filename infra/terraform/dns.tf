locals {
  zone_name = "kdorzak.online"
}

# NOTE:
# - You generally should not CNAME `app`/`api` to the zone apex (kdorzak.online).
# - Instead, point them at the actual hosting targets (e.g. Cloudflare Pages `*.pages.dev`, a load balancer hostname, etc.).

resource "cloudflare_zone" "this" {
  account_id = var.cloudflare_account_id
  zone       = local.zone_name
}

# Where your dashboard is hosted (example: "my-dashboard.pages.dev")
variable "app_cname_target" {
  type        = string
  description = "CNAME target for app.<zone> (e.g. Cloudflare Pages hostname)"
}

# Where your API is hosted (example: "my-api.fly.dev" or "api-origin.example.com")
variable "api_cname_target" {
  type        = string
  description = "CNAME target for api.<zone>"
}

resource "cloudflare_dns_record" "app" {
  zone_id = cloudflare_zone.this.id
  name    = "app"
  type    = "CNAME"
  content = var.app_cname_target

  # "1" is "automatic" in Cloudflare
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "api" {
  zone_id = cloudflare_zone.this.id
  name    = "api"
  type    = "CNAME"
  content = var.api_cname_target

  ttl     = 1

  # If your API serves HTTP(S) and you want Cloudflare in front (WAF, caching controls, etc.), keep true.
  # If you need to expose raw TCP/UDP or are debugging origin connectivity, set to false.
  proxied = true
}