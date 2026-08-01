"""JupyterLab server configuration for the OpenLakehouse notebook environment.

Served behind Traefik at the /jupyter path prefix (no path stripping, matching
the pattern used for the backend's /api prefix), so base_url must match.
"""
import os

c = get_config()  # noqa: F821

c.ServerApp.ip = "0.0.0.0"
c.ServerApp.port = 8888
c.ServerApp.open_browser = False
c.ServerApp.allow_root = True
c.ServerApp.root_dir = "/opt/notebooks"
c.ServerApp.token = os.environ.get("JUPYTER_TOKEN", "openlakehouse")
c.ServerApp.password = ""
c.ServerApp.base_url = os.environ.get("JUPYTER_BASE_URL", "/jupyter/")
c.ServerApp.allow_origin = "*"
c.ServerApp.disable_check_xsrf = True
c.ServerApp.trust_xheaders = True
c.ServerApp.tornado_settings = {
    "headers": {
        "Content-Security-Policy": "frame-ancestors *",
    }
}
