variable "project_name" {
  description = "Logical project name used as a prefix for provisioned resources."
  type        = string
  default     = "weather-station"
}

variable "environment" {
  description = "Environment identifier (e.g., dev, prod)."
  type        = string
  default     = "dev"
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with permissions to manage Workers and Pages."
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Database connection URL (secret). Placeholder is fine for now."
  type        = string
  sensitive   = true
  default     = "REPLACE_ME"
}

variable "cloudflare_workers_subdomain" {
  description = "Cloudflare workers.dev account subdomain (visible in the Workers dashboard)."
  type        = string
  default     = "kdorzak"
}