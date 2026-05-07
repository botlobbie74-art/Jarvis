#!/usr/bin/env python3
"""
Comprehensive backend API test for Wingman application.
Tests all auth, chat, plugins, and tasks endpoints.
"""
import requests
import json
import time
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://jarvis-clone-81.preview.emergentagent.com/api"

# Test data - using real-looking credentials
TEST_EMAIL = f"sarah.chen+test{int(time.time())}@techcorp.io"
TEST_PASSWORD = "SecurePass2025!"
TEST_NAME = "Sarah Chen"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def log_test(test_name, passed, details=""):
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"{status} | {test_name}")
    if details:
        print(f"       {details}")
    return passed

def log_section(section_name):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{section_name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

# Global variables to store test data
access_token = None
user_id = None
session_id = None
task_id = None

def test_1_signup():
    """Test 1: POST /api/auth/signup with unique email/name/password"""
    global access_token, user_id
    log_section("TEST 1: User Signup")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/signup",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            },
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Signup", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        data = response.json()
        
        # Verify response structure
        if "access_token" not in data:
            return log_test("Signup", False, "Missing access_token in response")
        if "user" not in data:
            return log_test("Signup", False, "Missing user in response")
        
        user = data["user"]
        if not all(k in user for k in ["id", "email", "name", "created_at"]):
            return log_test("Signup", False, "Missing required user fields")
        
        access_token = data["access_token"]
        user_id = user["id"]
        
        return log_test("Signup", True, f"User created: {user['email']}, Token: {access_token[:20]}...")
    
    except Exception as e:
        return log_test("Signup", False, f"Exception: {str(e)}")

def test_2_get_me():
    """Test 2: GET /api/auth/me with Bearer token"""
    log_section("TEST 2: Get Current User")
    
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Get /auth/me", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        user = response.json()
        
        if user.get("id") != user_id:
            return log_test("Get /auth/me", False, f"User ID mismatch: {user.get('id')} != {user_id}")
        
        if user.get("email") != TEST_EMAIL.lower():
            return log_test("Get /auth/me", False, f"Email mismatch: {user.get('email')} != {TEST_EMAIL.lower()}")
        
        return log_test("Get /auth/me", True, f"User verified: {user['email']}")
    
    except Exception as e:
        return log_test("Get /auth/me", False, f"Exception: {str(e)}")

def test_3_login():
    """Test 3: POST /api/auth/login with same credentials"""
    log_section("TEST 3: User Login")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            },
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Login", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        data = response.json()
        
        if "access_token" not in data or "user" not in data:
            return log_test("Login", False, "Missing access_token or user in response")
        
        return log_test("Login", True, f"Login successful, Token: {data['access_token'][:20]}...")
    
    except Exception as e:
        return log_test("Login", False, f"Exception: {str(e)}")

def test_4_duplicate_signup():
    """Test 4: Duplicate signup -> 400"""
    log_section("TEST 4: Duplicate Signup (should fail)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/signup",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            },
            timeout=10
        )
        
        if response.status_code == 400:
            return log_test("Duplicate signup", True, f"Correctly rejected with 400: {response.json().get('detail', '')}")
        else:
            return log_test("Duplicate signup", False, f"Expected 400, got {response.status_code}")
    
    except Exception as e:
        return log_test("Duplicate signup", False, f"Exception: {str(e)}")

def test_5_wrong_password():
    """Test 5: Login with wrong password -> 401"""
    log_section("TEST 5: Login with Wrong Password (should fail)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": "WrongPassword123!"
            },
            timeout=10
        )
        
        if response.status_code == 401:
            return log_test("Wrong password login", True, f"Correctly rejected with 401: {response.json().get('detail', '')}")
        else:
            return log_test("Wrong password login", False, f"Expected 401, got {response.status_code}")
    
    except Exception as e:
        return log_test("Wrong password login", False, f"Exception: {str(e)}")

def test_6_create_session():
    """Test 6: POST /api/chat/sessions?assistant_id=jarvis"""
    global session_id
    log_section("TEST 6: Create Chat Session")
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/sessions?assistant_id=jarvis",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Create session", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        session = response.json()
        
        if not all(k in session for k in ["id", "user_id", "title", "assistant_id", "created_at"]):
            return log_test("Create session", False, "Missing required session fields")
        
        if session["assistant_id"] != "jarvis":
            return log_test("Create session", False, f"Expected assistant_id 'jarvis', got '{session['assistant_id']}'")
        
        session_id = session["id"]
        
        return log_test("Create session", True, f"Session created: {session_id}, Assistant: {session['assistant_id']}")
    
    except Exception as e:
        return log_test("Create session", False, f"Exception: {str(e)}")

def test_7_send_message():
    """Test 7: POST /api/chat/send - verify Gemini 2.5 Pro responds"""
    log_section("TEST 7: Send Message to Jarvis (Gemini 2.5 Pro)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "session_id": session_id,
                "message": "Hi, who are you in 1 short sentence?",
                "assistant_id": "jarvis"
            },
            timeout=30  # LLM calls may take longer
        )
        
        if response.status_code != 200:
            return log_test("Send message", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        message = response.json()
        
        if not all(k in message for k in ["id", "session_id", "role", "content", "assistant_id"]):
            return log_test("Send message", False, "Missing required message fields")
        
        if message["role"] != "assistant":
            return log_test("Send message", False, f"Expected role 'assistant', got '{message['role']}'")
        
        content = message["content"]
        
        # Critical check: verify no LLM error
        if "LLM error" in content:
            return log_test("Send message", False, f"LLM ERROR detected: {content}")
        
        if not content or len(content.strip()) == 0:
            return log_test("Send message", False, "Empty response from assistant")
        
        return log_test("Send message", True, f"Assistant replied: '{content[:100]}...'")
    
    except Exception as e:
        return log_test("Send message", False, f"Exception: {str(e)}")

def test_8_get_messages():
    """Test 8: GET /api/chat/sessions/{id}/messages -> 2 messages"""
    log_section("TEST 8: Get Session Messages")
    
    try:
        response = requests.get(
            f"{BASE_URL}/chat/sessions/{session_id}/messages",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Get messages", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        messages = response.json()
        
        if not isinstance(messages, list):
            return log_test("Get messages", False, "Response is not a list")
        
        if len(messages) != 2:
            return log_test("Get messages", False, f"Expected 2 messages, got {len(messages)}")
        
        # Verify first is user, second is assistant
        if messages[0]["role"] != "user" or messages[1]["role"] != "assistant":
            return log_test("Get messages", False, f"Expected user then assistant, got {messages[0]['role']} then {messages[1]['role']}")
        
        return log_test("Get messages", True, f"Found 2 messages: user + assistant")
    
    except Exception as e:
        return log_test("Get messages", False, f"Exception: {str(e)}")

def test_9_list_sessions():
    """Test 9: GET /api/chat/sessions -> at least 1"""
    log_section("TEST 9: List All Sessions")
    
    try:
        response = requests.get(
            f"{BASE_URL}/chat/sessions",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("List sessions", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        sessions = response.json()
        
        if not isinstance(sessions, list):
            return log_test("List sessions", False, "Response is not a list")
        
        if len(sessions) < 1:
            return log_test("List sessions", False, f"Expected at least 1 session, got {len(sessions)}")
        
        # Verify our session is in the list
        session_ids = [s["id"] for s in sessions]
        if session_id not in session_ids:
            return log_test("List sessions", False, f"Created session {session_id} not in list")
        
        return log_test("List sessions", True, f"Found {len(sessions)} session(s)")
    
    except Exception as e:
        return log_test("List sessions", False, f"Exception: {str(e)}")

def test_10_followup_message():
    """Test 10: Send follow-up message in same session"""
    log_section("TEST 10: Send Follow-up Message")
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/send",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "session_id": session_id,
                "message": "What is 2+2?",
                "assistant_id": "jarvis"
            },
            timeout=30
        )
        
        if response.status_code != 200:
            return log_test("Follow-up message", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        message = response.json()
        content = message["content"]
        
        if "LLM error" in content:
            return log_test("Follow-up message", False, f"LLM ERROR detected: {content}")
        
        if not content or len(content.strip()) == 0:
            return log_test("Follow-up message", False, "Empty response from assistant")
        
        # Check if response contains "4" (contextual answer to 2+2)
        has_answer = "4" in content
        
        return log_test("Follow-up message", True, f"Assistant replied: '{content[:100]}...' (Contains '4': {has_answer})")
    
    except Exception as e:
        return log_test("Follow-up message", False, f"Exception: {str(e)}")

def test_11_list_plugins():
    """Test 11: GET /api/plugins -> 6 plugins all disconnected initially"""
    log_section("TEST 11: List Plugins")
    
    try:
        response = requests.get(
            f"{BASE_URL}/plugins",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("List plugins", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        plugins = response.json()
        
        if not isinstance(plugins, list):
            return log_test("List plugins", False, "Response is not a list")
        
        if len(plugins) != 6:
            return log_test("List plugins", False, f"Expected 6 plugins, got {len(plugins)}")
        
        # Verify all are disconnected initially
        connected = [p for p in plugins if p.get("status") == "connected"]
        if connected:
            return log_test("List plugins", False, f"Expected all disconnected, but {len(connected)} are connected")
        
        plugin_names = [p.get("name") for p in plugins]
        
        return log_test("List plugins", True, f"Found 6 plugins (all disconnected): {', '.join(plugin_names)}")
    
    except Exception as e:
        return log_test("List plugins", False, f"Exception: {str(e)}")

def test_12_connect_plugin():
    """Test 12: POST /api/plugins/toggle connect GitHub"""
    log_section("TEST 12: Connect Plugin (GitHub)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/plugins/toggle",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "plugin_id": "github",
                "plugin_name": "GitHub",
                "action": "connect"
            },
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Connect plugin", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        result = response.json()
        
        if result.get("status") != "connected":
            return log_test("Connect plugin", False, f"Expected status 'connected', got '{result.get('status')}'")
        
        if result.get("plugin_id") != "github":
            return log_test("Connect plugin", False, f"Expected plugin_id 'github', got '{result.get('plugin_id')}'")
        
        return log_test("Connect plugin", True, f"GitHub connected successfully")
    
    except Exception as e:
        return log_test("Connect plugin", False, f"Exception: {str(e)}")

def test_13_verify_plugin_connected():
    """Test 13: GET /api/plugins -> github is connected"""
    log_section("TEST 13: Verify Plugin Connected")
    
    try:
        response = requests.get(
            f"{BASE_URL}/plugins",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Verify plugin", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        plugins = response.json()
        
        github = next((p for p in plugins if p.get("id") == "github"), None)
        
        if not github:
            return log_test("Verify plugin", False, "GitHub plugin not found in list")
        
        if github.get("status") != "connected":
            return log_test("Verify plugin", False, f"Expected GitHub status 'connected', got '{github.get('status')}'")
        
        return log_test("Verify plugin", True, f"GitHub is connected")
    
    except Exception as e:
        return log_test("Verify plugin", False, f"Exception: {str(e)}")

def test_14_disconnect_plugin():
    """Test 14: POST /api/plugins/toggle disconnect"""
    log_section("TEST 14: Disconnect Plugin (GitHub)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/plugins/toggle",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "plugin_id": "github",
                "plugin_name": "GitHub",
                "action": "disconnect"
            },
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Disconnect plugin", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        result = response.json()
        
        if result.get("status") != "disconnected":
            return log_test("Disconnect plugin", False, f"Expected status 'disconnected', got '{result.get('status')}'")
        
        return log_test("Disconnect plugin", True, f"GitHub disconnected successfully")
    
    except Exception as e:
        return log_test("Disconnect plugin", False, f"Exception: {str(e)}")

def test_15_create_task():
    """Test 15: POST /api/tasks"""
    global task_id
    log_section("TEST 15: Create Background Task")
    
    try:
        response = requests.post(
            f"{BASE_URL}/tasks",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "title": "Daily summary",
                "schedule": "daily 8am",
                "plugins": []
            },
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Create task", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        task = response.json()
        
        if not all(k in task for k in ["id", "user_id", "title", "schedule", "status"]):
            return log_test("Create task", False, "Missing required task fields")
        
        if task["title"] != "Daily summary":
            return log_test("Create task", False, f"Expected title 'Daily summary', got '{task['title']}'")
        
        task_id = task["id"]
        
        return log_test("Create task", True, f"Task created: {task['title']} ({task['schedule']})")
    
    except Exception as e:
        return log_test("Create task", False, f"Exception: {str(e)}")

def test_16_list_tasks():
    """Test 16: GET /api/tasks -> at least 1"""
    log_section("TEST 16: List Tasks")
    
    try:
        response = requests.get(
            f"{BASE_URL}/tasks",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("List tasks", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        tasks = response.json()
        
        if not isinstance(tasks, list):
            return log_test("List tasks", False, "Response is not a list")
        
        if len(tasks) < 1:
            return log_test("List tasks", False, f"Expected at least 1 task, got {len(tasks)}")
        
        # Verify our task is in the list
        task_ids = [t["id"] for t in tasks]
        if task_id not in task_ids:
            return log_test("List tasks", False, f"Created task {task_id} not in list")
        
        return log_test("List tasks", True, f"Found {len(tasks)} task(s)")
    
    except Exception as e:
        return log_test("List tasks", False, f"Exception: {str(e)}")

def test_17_delete_task():
    """Test 17: DELETE /api/tasks/{id}"""
    log_section("TEST 17: Delete Task")
    
    try:
        response = requests.delete(
            f"{BASE_URL}/tasks/{task_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Delete task", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        result = response.json()
        
        if not result.get("ok"):
            return log_test("Delete task", False, f"Expected ok: true, got {result}")
        
        return log_test("Delete task", True, f"Task deleted successfully")
    
    except Exception as e:
        return log_test("Delete task", False, f"Exception: {str(e)}")

def test_18_delete_session():
    """Test 18: DELETE /api/chat/sessions/{id}"""
    log_section("TEST 18: Delete Chat Session")
    
    try:
        response = requests.delete(
            f"{BASE_URL}/chat/sessions/{session_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            return log_test("Delete session", False, f"Expected 200, got {response.status_code}: {response.text}")
        
        result = response.json()
        
        if not result.get("ok"):
            return log_test("Delete session", False, f"Expected ok: true, got {result}")
        
        return log_test("Delete session", True, f"Session deleted successfully")
    
    except Exception as e:
        return log_test("Delete session", False, f"Exception: {str(e)}")


def main():
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}WINGMAN BACKEND API TEST SUITE{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    results = []
    
    # Run all tests in sequence
    results.append(test_1_signup())
    if not results[-1]:
        print(f"\n{RED}CRITICAL: Signup failed. Cannot continue tests.{RESET}")
        return
    
    results.append(test_2_get_me())
    results.append(test_3_login())
    results.append(test_4_duplicate_signup())
    results.append(test_5_wrong_password())
    
    results.append(test_6_create_session())
    if not results[-1]:
        print(f"\n{RED}CRITICAL: Session creation failed. Skipping chat tests.{RESET}")
    else:
        results.append(test_7_send_message())
        results.append(test_8_get_messages())
        results.append(test_9_list_sessions())
        results.append(test_10_followup_message())
    
    results.append(test_11_list_plugins())
    results.append(test_12_connect_plugin())
    results.append(test_13_verify_plugin_connected())
    results.append(test_14_disconnect_plugin())
    
    results.append(test_15_create_task())
    results.append(test_16_list_tasks())
    results.append(test_17_delete_task())
    
    if session_id:
        results.append(test_18_delete_session())
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"Total Tests: {total}")
    print(f"{GREEN}Passed: {passed}{RESET}")
    print(f"{RED}Failed: {total - passed}{RESET}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if passed == total:
        print(f"\n{GREEN}✓ ALL TESTS PASSED!{RESET}")
        return 0
    else:
        print(f"\n{RED}✗ SOME TESTS FAILED{RESET}")
        return 1

if __name__ == "__main__":
    exit(main())
