variable "cloudflare_account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with permissions to manage Workers and Pages."
  type        = string
  sensitive   = true
}

variable "main_zone_name" {
  type    = string
  default = "kdorzak.online"
}