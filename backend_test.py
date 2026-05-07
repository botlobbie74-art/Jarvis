#!/usr/bin/env python3
"""
Comprehensive Backend API Test for Jarvis Clone
Tests all 23 endpoints in order as specified in review request
"""
import requests
import time
import json
from datetime import datetime

# Configuration
BASE_URL = "https://jarvis-clone-81.preview.emergentagent.com/api"
TIMEOUT = 120  # 2 minutes for long-running operations

# Generate unique test credentials
timestamp = int(time.time())
TEST_EMAIL = f"jarvis_test_{timestamp}@example.com"
TEST_PASSWORD = "SecureTestPass123!"
TEST_NAME = "Jarvis Test User"

# Global state
token = None
user_id = None
session_id = None
project_id = None
task_id = None

# Test results tracking
results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_test(test_num, name, status, details=""):
    """Log test result"""
    prefix = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"{prefix} Test {test_num}: {name}")
    if details:
        print(f"   {details}")
    
    if status == "PASS":
        results["passed"].append(f"Test {test_num}: {name}")
    elif status == "FAIL":
        results["failed"].append(f"Test {test_num}: {name} - {details}")
    else:
        results["warnings"].append(f"Test {test_num}: {name} - {details}")

def make_request(method, endpoint, **kwargs):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            resp = requests.get(url, timeout=kwargs.get('timeout', TIMEOUT), **{k:v for k,v in kwargs.items() if k != 'timeout'})
        elif method == "POST":
            resp = requests.post(url, timeout=kwargs.get('timeout', TIMEOUT), **{k:v for k,v in kwargs.items() if k != 'timeout'})
        elif method == "PUT":
            resp = requests.put(url, timeout=kwargs.get('timeout', TIMEOUT), **{k:v for k,v in kwargs.items() if k != 'timeout'})
        elif method == "DELETE":
            resp = requests.delete(url, timeout=kwargs.get('timeout', TIMEOUT), **{k:v for k,v in kwargs.items() if k != 'timeout'})
        return resp
    except requests.exceptions.Timeout:
        return None
    except Exception as e:
        print(f"   Request error: {str(e)}")
        return None

print("=" * 80)
print("JARVIS BACKEND API TEST SUITE")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"Test Email: {TEST_EMAIL}")
print(f"Timestamp: {datetime.now().isoformat()}")
print("=" * 80)
print()

# ============ AUTH TESTS ============
print("🔐 AUTHENTICATION TESTS")
print("-" * 80)

# Test 1: Signup
print("\n1️⃣  Testing POST /auth/signup")
resp = make_request("POST", "/auth/signup", json={
    "email": TEST_EMAIL,
    "password": TEST_PASSWORD,
    "name": TEST_NAME
})

if resp and resp.status_code == 200:
    data = resp.json()
    if "access_token" in data and "user" in data:
        token = data["access_token"]
        user_id = data["user"]["id"]
        log_test(1, "POST /auth/signup", "PASS", f"User created: {user_id}")
    else:
        log_test(1, "POST /auth/signup", "FAIL", f"Missing token or user in response: {data}")
else:
    log_test(1, "POST /auth/signup", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}, Body: {resp.text if resp else 'N/A'}")

# Test 2: Get current user
print("\n2️⃣  Testing GET /auth/me")
if token:
    resp = make_request("GET", "/auth/me", headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get("id") == user_id and data.get("email") == TEST_EMAIL.lower():
            log_test(2, "GET /auth/me", "PASS", f"User verified: {data.get('name')}")
        else:
            log_test(2, "GET /auth/me", "FAIL", f"User data mismatch: {data}")
    else:
        log_test(2, "GET /auth/me", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(2, "GET /auth/me", "FAIL", "No token from signup")

# Test 3: Login
print("\n3️⃣  Testing POST /auth/login")
resp = make_request("POST", "/auth/login", json={
    "email": TEST_EMAIL,
    "password": TEST_PASSWORD
})

if resp and resp.status_code == 200:
    data = resp.json()
    if "access_token" in data and data["user"]["id"] == user_id:
        log_test(3, "POST /auth/login", "PASS", "Login successful with same credentials")
    else:
        log_test(3, "POST /auth/login", "FAIL", f"Token or user mismatch: {data}")
else:
    log_test(3, "POST /auth/login", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")

# ============ CHAT TESTS ============
print("\n\n💬 CHAT TESTS")
print("-" * 80)

# Test 4: Create session
print("\n4️⃣  Testing POST /chat/sessions")
if token:
    resp = make_request("POST", "/chat/sessions", 
                       params={"assistant_id": "jarvis"},
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if "id" in data and data.get("assistant_id") == "jarvis":
            session_id = data["id"]
            log_test(4, "POST /chat/sessions", "PASS", f"Session created: {session_id}")
        else:
            log_test(4, "POST /chat/sessions", "FAIL", f"Invalid session data: {data}")
    else:
        log_test(4, "POST /chat/sessions", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(4, "POST /chat/sessions", "FAIL", "No auth token")

# Test 5: Send message (LLM test)
print("\n5️⃣  Testing POST /chat/send (Gemini 2.5 Pro)")
if token and session_id:
    print("   ⏳ Waiting for LLM response (may take 10-20s)...")
    resp = make_request("POST", "/chat/send", 
                       json={
                           "session_id": session_id,
                           "message": "In one short sentence, who are you?",
                           "assistant_id": "jarvis"
                       },
                       headers={"Authorization": f"Bearer {token}"},
                       timeout=60)
    if resp and resp.status_code == 200:
        data = resp.json()
        content = data.get("content", "")
        if content and "LLM error" not in content and len(content) > 10:
            log_test(5, "POST /chat/send", "PASS", f"Assistant replied: {content[:100]}...")
        elif "LLM error" in content:
            log_test(5, "POST /chat/send", "FAIL", f"LLM ERROR: {content}")
        else:
            log_test(5, "POST /chat/send", "FAIL", f"Empty or invalid response: {content}")
    else:
        log_test(5, "POST /chat/send", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(5, "POST /chat/send", "FAIL", "No session or token")

# Test 6: Get messages
print("\n6️⃣  Testing GET /chat/sessions/{id}/messages")
if token and session_id:
    resp = make_request("GET", f"/chat/sessions/{session_id}/messages",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if len(data) >= 2:
            log_test(6, "GET /chat/sessions/{id}/messages", "PASS", f"Found {len(data)} messages")
        else:
            log_test(6, "GET /chat/sessions/{id}/messages", "FAIL", f"Expected 2+ messages, got {len(data)}")
    else:
        log_test(6, "GET /chat/sessions/{id}/messages", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(6, "GET /chat/sessions/{id}/messages", "FAIL", "No session or token")

# Test 7: List sessions
print("\n7️⃣  Testing GET /chat/sessions")
if token:
    resp = make_request("GET", "/chat/sessions",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if len(data) >= 1:
            log_test(7, "GET /chat/sessions", "PASS", f"Found {len(data)} session(s)")
        else:
            log_test(7, "GET /chat/sessions", "FAIL", "Expected at least 1 session")
    else:
        log_test(7, "GET /chat/sessions", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(7, "GET /chat/sessions", "FAIL", "No token")

# ============ PLUGINS TESTS ============
print("\n\n🔌 PLUGINS TESTS")
print("-" * 80)

# Test 8: List plugins
print("\n8️⃣  Testing GET /plugins")
if token:
    resp = make_request("GET", "/plugins",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        plugin_names = [p.get("name") for p in data]
        has_discord = any("Discord" in name for name in plugin_names)
        all_disconnected = all(p.get("status") == "disconnected" for p in data)
        
        if len(data) == 5 and not has_discord:
            if all_disconnected:
                log_test(8, "GET /plugins", "PASS", f"5 plugins, no Discord, all disconnected initially")
            else:
                log_test(8, "GET /plugins", "WARN", f"5 plugins but some already connected: {[p['name'] for p in data if p['status']=='connected']}")
        else:
            log_test(8, "GET /plugins", "FAIL", f"Expected 5 plugins without Discord, got {len(data)}: {plugin_names}")
    else:
        log_test(8, "GET /plugins", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(8, "GET /plugins", "FAIL", "No token")

# Test 9: Connect plugin
print("\n9️⃣  Testing POST /plugins/toggle (connect)")
if token:
    resp = make_request("POST", "/plugins/toggle",
                       json={
                           "plugin_id": "github",
                           "plugin_name": "GitHub",
                           "action": "connect"
                       },
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get("status") == "connected" and data.get("plugin_id") == "github":
            log_test(9, "POST /plugins/toggle (connect)", "PASS", "GitHub connected")
        else:
            log_test(9, "POST /plugins/toggle (connect)", "FAIL", f"Unexpected response: {data}")
    else:
        log_test(9, "POST /plugins/toggle (connect)", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(9, "POST /plugins/toggle (connect)", "FAIL", "No token")

# Test 10: Verify plugin connected
print("\n🔟 Testing GET /plugins (verify GitHub connected)")
if token:
    resp = make_request("GET", "/plugins",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        github = next((p for p in data if p.get("id") == "github"), None)
        if github and github.get("status") == "connected":
            log_test(10, "GET /plugins (verify connected)", "PASS", "GitHub is connected")
        else:
            log_test(10, "GET /plugins (verify connected)", "FAIL", f"GitHub not connected: {github}")
    else:
        log_test(10, "GET /plugins (verify connected)", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(10, "GET /plugins (verify connected)", "FAIL", "No token")

# Test 11: Disconnect plugin
print("\n1️⃣1️⃣  Testing POST /plugins/toggle (disconnect)")
if token:
    resp = make_request("POST", "/plugins/toggle",
                       json={
                           "plugin_id": "github",
                           "plugin_name": "GitHub",
                           "action": "disconnect"
                       },
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get("status") == "disconnected":
            log_test(11, "POST /plugins/toggle (disconnect)", "PASS", "GitHub disconnected")
        else:
            log_test(11, "POST /plugins/toggle (disconnect)", "FAIL", f"Unexpected response: {data}")
    else:
        log_test(11, "POST /plugins/toggle (disconnect)", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(11, "POST /plugins/toggle (disconnect)", "FAIL", "No token")

# Test 12: Google OAuth start
print("\n1️⃣2️⃣  Testing GET /auth/google/start")
if token:
    resp = make_request("GET", "/auth/google/start",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        auth_url = data.get("auth_url", "")
        if "accounts.google.com" in auth_url and "685252161076" in auth_url:
            log_test(12, "GET /auth/google/start", "PASS", "OAuth URL contains accounts.google.com and client_id 685252161076")
        elif "accounts.google.com" in auth_url:
            log_test(12, "GET /auth/google/start", "WARN", f"OAuth URL valid but client_id not 685252161076: {auth_url[:150]}")
        else:
            log_test(12, "GET /auth/google/start", "FAIL", f"Invalid auth_url: {auth_url}")
    else:
        log_test(12, "GET /auth/google/start", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(12, "GET /auth/google/start", "FAIL", "No token")

# ============ TASKS TESTS ============
print("\n\n📋 TASKS TESTS")
print("-" * 80)

# Test 13: Create task
print("\n1️⃣3️⃣  Testing POST /tasks")
if token:
    resp = make_request("POST", "/tasks",
                       json={
                           "title": "Daily summary",
                           "schedule": "daily 8am"
                       },
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if "id" in data and data.get("title") == "Daily summary":
            task_id = data["id"]
            log_test(13, "POST /tasks", "PASS", f"Task created: {task_id}")
        else:
            log_test(13, "POST /tasks", "FAIL", f"Invalid task data: {data}")
    else:
        log_test(13, "POST /tasks", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(13, "POST /tasks", "FAIL", "No token")

# Test 14: List tasks
print("\n1️⃣4️⃣  Testing GET /tasks")
if token:
    resp = make_request("GET", "/tasks",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if len(data) >= 1:
            log_test(14, "GET /tasks", "PASS", f"Found {len(data)} task(s)")
        else:
            log_test(14, "GET /tasks", "FAIL", "Expected at least 1 task")
    else:
        log_test(14, "GET /tasks", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(14, "GET /tasks", "FAIL", "No token")

# Test 15: Delete task
print("\n1️⃣5️⃣  Testing DELETE /tasks/{id}")
if token and task_id:
    resp = make_request("DELETE", f"/tasks/{task_id}",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get("ok"):
            log_test(15, "DELETE /tasks/{id}", "PASS", "Task deleted")
        else:
            log_test(15, "DELETE /tasks/{id}", "FAIL", f"Unexpected response: {data}")
    else:
        log_test(15, "DELETE /tasks/{id}", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(15, "DELETE /tasks/{id}", "FAIL", "No task_id or token")

# ============ CODE AGENT TESTS ============
print("\n\n🤖 CODE AGENT TESTS")
print("-" * 80)

# Test 16: Plan project
print("\n1️⃣6️⃣  Testing POST /projects/plan (Gemini - may take 10-20s)")
if token:
    print("   ⏳ Generating project plan with Gemini 2.5 Pro...")
    resp = make_request("POST", "/projects/plan",
                       json={
                           "description": "a simple notes app with auth, list of notes, create/edit/delete"
                       },
                       headers={"Authorization": f"Bearer {token}"},
                       timeout=60)
    if resp and resp.status_code == 200:
        data = resp.json()
        plan = data.get("plan", {})
        steps = plan.get("steps", [])
        files_to_gen = plan.get("files_to_generate", [])
        
        if len(steps) >= 3 and len(files_to_gen) >= 3:
            project_id = data.get("id")
            log_test(16, "POST /projects/plan", "PASS", f"Plan created with {len(steps)} steps, {len(files_to_gen)} files")
        else:
            log_test(16, "POST /projects/plan", "FAIL", f"Plan incomplete: {len(steps)} steps, {len(files_to_gen)} files. Plan: {json.dumps(plan, indent=2)[:500]}")
    else:
        log_test(16, "POST /projects/plan", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}, Body: {resp.text[:500] if resp else 'N/A'}")
else:
    log_test(16, "POST /projects/plan", "FAIL", "No token")

# Test 17: List projects
print("\n1️⃣7️⃣  Testing GET /projects")
if token:
    resp = make_request("GET", "/projects",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if len(data) >= 1:
            log_test(17, "GET /projects", "PASS", f"Found {len(data)} project(s)")
        else:
            log_test(17, "GET /projects", "FAIL", "Expected at least 1 project")
    else:
        log_test(17, "GET /projects", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(17, "GET /projects", "FAIL", "No token")

# Test 18: Build project
print("\n1️⃣8️⃣  Testing POST /projects/{id}/build (may take 30-90s)")
if token and project_id:
    print("   ⏳ Building project files with Gemini (this will take time)...")
    resp = make_request("POST", f"/projects/{project_id}/build",
                       headers={"Authorization": f"Bearer {token}"},
                       timeout=120)
    if resp and resp.status_code == 200:
        data = resp.json()
        generated = data.get("generated", [])
        if data.get("ok") and len(generated) >= 1:
            log_test(18, "POST /projects/{id}/build", "PASS", f"Built {len(generated)} files: {', '.join(generated[:5])}")
        else:
            log_test(18, "POST /projects/{id}/build", "FAIL", f"Build incomplete: {data}")
    else:
        log_test(18, "POST /projects/{id}/build", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(18, "POST /projects/{id}/build", "FAIL", "No project_id or token")

# Test 19: Get project with files
print("\n1️⃣9️⃣  Testing GET /projects/{id}")
if token and project_id:
    resp = make_request("GET", f"/projects/{project_id}",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        files = data.get("files", [])
        if len(files) >= 1 and all("content" in f for f in files):
            log_test(19, "GET /projects/{id}", "PASS", f"Project has {len(files)} files with content")
        else:
            log_test(19, "GET /projects/{id}", "FAIL", f"Files missing or no content: {len(files)} files")
    else:
        log_test(19, "GET /projects/{id}", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(19, "GET /projects/{id}", "FAIL", "No project_id or token")

# Test 20: Update file
print("\n2️⃣0️⃣  Testing PUT /projects/{id}/files")
if token and project_id:
    resp = make_request("PUT", f"/projects/{project_id}/files",
                       json={
                           "path": "README.md",
                           "content": "# Test",
                           "language": "markdown"
                       },
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get("ok"):
            # Verify the update
            verify_resp = make_request("GET", f"/projects/{project_id}",
                                      headers={"Authorization": f"Bearer {token}"})
            if verify_resp and verify_resp.status_code == 200:
                verify_data = verify_resp.json()
                readme = next((f for f in verify_data.get("files", []) if f.get("path") == "README.md"), None)
                if readme and readme.get("content") == "# Test":
                    log_test(20, "PUT /projects/{id}/files", "PASS", "File updated and verified")
                else:
                    log_test(20, "PUT /projects/{id}/files", "FAIL", f"File not updated correctly: {readme}")
            else:
                log_test(20, "PUT /projects/{id}/files", "WARN", "Update succeeded but verification failed")
        else:
            log_test(20, "PUT /projects/{id}/files", "FAIL", f"Unexpected response: {data}")
    else:
        log_test(20, "PUT /projects/{id}/files", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(20, "PUT /projects/{id}/files", "FAIL", "No project_id or token")

# Test 21: Push to GitHub
print("\n2️⃣1️⃣  Testing POST /projects/{id}/push-github (may take 10-30s)")
if token and project_id:
    print("   ⏳ Pushing to GitHub (creating real repo)...")
    resp = make_request("POST", f"/projects/{project_id}/push-github",
                       headers={"Authorization": f"Bearer {token}"},
                       timeout=60)
    if resp and resp.status_code == 200:
        data = resp.json()
        github_url = data.get("github_url", "")
        if data.get("ok") and "github.com" in github_url:
            log_test(21, "POST /projects/{id}/push-github", "PASS", f"Pushed to GitHub: {github_url}")
        else:
            log_test(21, "POST /projects/{id}/push-github", "FAIL", f"Invalid response: {data}")
    elif resp and resp.status_code == 400:
        log_test(21, "POST /projects/{id}/push-github", "WARN", f"GitHub token not configured: {resp.text}")
    else:
        log_test(21, "POST /projects/{id}/push-github", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}, Body: {resp.text[:200] if resp else 'N/A'}")
else:
    log_test(21, "POST /projects/{id}/push-github", "FAIL", "No project_id or token")

# Test 22: Delete project
print("\n2️⃣2️⃣  Testing DELETE /projects/{id}")
if token and project_id:
    resp = make_request("DELETE", f"/projects/{project_id}",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get("ok"):
            log_test(22, "DELETE /projects/{id}", "PASS", "Project deleted")
        else:
            log_test(22, "DELETE /projects/{id}", "FAIL", f"Unexpected response: {data}")
    else:
        log_test(22, "DELETE /projects/{id}", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(22, "DELETE /projects/{id}", "FAIL", "No project_id or token")

# Test 23: Delete session
print("\n2️⃣3️⃣  Testing DELETE /chat/sessions/{id}")
if token and session_id:
    resp = make_request("DELETE", f"/chat/sessions/{session_id}",
                       headers={"Authorization": f"Bearer {token}"})
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get("ok"):
            log_test(23, "DELETE /chat/sessions/{id}", "PASS", "Session deleted")
        else:
            log_test(23, "DELETE /chat/sessions/{id}", "FAIL", f"Unexpected response: {data}")
    else:
        log_test(23, "DELETE /chat/sessions/{id}", "FAIL", f"Status: {resp.status_code if resp else 'timeout'}")
else:
    log_test(23, "DELETE /chat/sessions/{id}", "FAIL", "No session_id or token")

# ============ SUMMARY ============
print("\n\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"✅ PASSED: {len(results['passed'])}")
print(f"❌ FAILED: {len(results['failed'])}")
print(f"⚠️  WARNINGS: {len(results['warnings'])}")
print()

if results['failed']:
    print("FAILED TESTS:")
    for fail in results['failed']:
        print(f"  ❌ {fail}")
    print()

if results['warnings']:
    print("WARNINGS:")
    for warn in results['warnings']:
        print(f"  ⚠️  {warn}")
    print()

print("=" * 80)
exit_code = 0 if len(results['failed']) == 0 else 1
exit(exit_code)
