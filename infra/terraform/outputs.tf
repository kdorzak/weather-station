output "api_worker_script_name" {
  description = "Deployed Worker script name."
  value       = cloudflare_workers_script.api.script_name
}

output "api_workers_dev_hint" {
  description = "Hint for workers.dev URL pattern (the account subdomain is set in Cloudflare)."
    value       = "https://${cloudflare_workers_script.api.script_name}.${var.cloudflare_workers_subdomain}.workers.dev"
}