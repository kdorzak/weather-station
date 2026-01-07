data "cloudflare_zone" "main" {
  filter = {
    name = var.main_zone_name
  }
}