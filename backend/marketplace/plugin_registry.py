import os
import json
from typing import List, Dict, Any

MODULES_DIR = os.path.join(os.path.dirname(__file__), "modules")

def list_modules() -> List[Dict[str, Any]]:
    modules = []
    if not os.path.exists(MODULES_DIR):
        return []
    
    for filename in os.listdir(MODULES_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(MODULES_DIR, filename), "r") as f:
                try:
                    modules.append(json.load(f))
                except:
                    continue
    return modules

def get_module(module_id: str) -> Dict[str, Any]:
    path = os.path.join(MODULES_DIR, f"{module_id}.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return None
