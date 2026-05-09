import os
import json
from typing import Dict, Any, List
import logging

log = logging.getLogger(__name__)

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")

def install_module(module: Dict[str, Any], project_id: str, sb_client) -> bool:
    """
    Executes the installation of a marketplace module into a project.
    In a real scenario, this would interact with the file system of the project 
    or the database representing the project's files.
    """
    try:
        # 1. Fetch files to inject
        files_to_inject = module.get("files_to_inject", [])
        for f in files_to_inject:
            path = f.get("path")
            template_name = f.get("template")
            
            template_path = os.path.join(TEMPLATES_DIR, template_name)
            if not os.path.exists(template_path):
                log.error(f"Template not found: {template_name}")
                continue
            
            with open(template_path, "r") as tf:
                content = tf.read()
                
            # Here we would update the project's virtual file system in DB
            # For this MVP, we'll simulate it by updating the jarvis_projects_files table
            sb_client.table("jarvis_projects_files").upsert({
                "project_id": project_id,
                "path": path,
                "content": content,
                "is_directory": False
            }).execute()

        # 2. Add required ENV vars to project metadata
        env_required = module.get("env_required", [])
        project = sb_client.table("jarvis_projects").select("metadata").eq("id", project_id).execute().data[0]
        metadata = project.get("metadata") or {}
        env_vars = metadata.get("env_vars", {})
        
        for env in env_required:
            if env not in env_vars:
                env_vars[env] = "" # Placeholder for user to fill
        
        metadata["env_vars"] = env_vars
        sb_client.table("jarvis_projects").update({"metadata": metadata}).eq("id", project_id).execute()

        # 3. Handle migrations (simulated for MVP)
        # In a real app, this would run SQL against the user's Supabase instance
        
        return True
    except Exception as e:
        log.exception(f"Failed to install module {module.get('id')}")
        return False
