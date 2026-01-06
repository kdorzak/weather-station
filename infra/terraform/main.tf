locals {
  api_script_name = "${var.project_name}-${var.environment}-api"
}

resource "cloudflare_pages_project" "web" {
  account_id        = var.cloudflare_account_id
  name              = "weather-station"
  production_branch = "main"
}

resource "cloudflare_workers_script" "api" {
  account_id  = var.cloudflare_account_id
  script_name = local.api_script_name

  content = <<EOT
export default {
  async fetch(request, env) {
    return new Response("Weather Station API: OK", { status: 200 });
  }
};
EOT

  bindings = [
    {
      name = "ENVIRONMENT"
      type = "plain_text"
      text = var.environment
    },
    {
      name = "DATABASE_URL"
      type = "plain_text"
      text = var.database_url
    }
  ]
}