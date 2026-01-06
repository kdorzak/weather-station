terraform {
  required_version = ">= 1.11.1"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 5.15.0"
    }
  }
}