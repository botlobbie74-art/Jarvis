import httpx
import json
import logging
from typing import Dict, Any, List, Optional

log = logging.getLogger("jarvis.mcp")

class MCPAdapter:
    def __init__(self, plugin_config: Dict[str, Any]):
        self.id = plugin_config.get("id")
        self.auth_type = plugin_config.get("auth_type")  # 'oauth2' | 'api_key' | 'webhook'
        self.actions = plugin_config.get("actions", [])
        self.base_url = plugin_config.get("base_url", "")

    async def execute(self, action_name: str, params: Dict[str, Any], credentials: Dict[str, Any]) -> Dict[str, Any]:
        action = next((a for a in self.actions if a["name"] == action_name), None)
        if not action:
            raise ValueError(f"Action {action_name} not found in {self.id}")
        
        url = action.get("endpoint")
        if not url.startswith("http"):
            url = f"{self.base_url.rstrip('/')}/{url.lstrip('/')}"
        
        method = action.get("method", "POST").upper()
        headers = self._build_headers(credentials)
        
        async with httpx.AsyncClient() as client:
            try:
                if method == "GET":
                    response = await client.get(url, headers=headers, params=params)
                else:
                    response = await client.request(method, url, headers=headers, json=params)
                
                response.raise_for_status()
                return response.json()
            except Exception as e:
                log.error(f"MCP Execution error ({self.id}:{action_name}): {e}")
                return {"error": str(e)}

    def _build_headers(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if self.auth_type == "api_key":
            api_key = credentials.get("api_key")
            headers["Authorization"] = f"Bearer {api_key}"
        elif self.auth_type == "oauth2":
            access_token = credentials.get("access_token")
            headers["Authorization"] = f"Bearer {access_token}"
        return headers

def load_mcp_plugin(plugin_id: str) -> Optional[MCPAdapter]:
    import os
    path = os.path.join(os.path.dirname(__file__), "plugins", f"{plugin_id}.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            config = json.load(f)
            return MCPAdapter(config)
    return None
