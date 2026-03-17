
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from attendance.models import AttendanceSession, AttendanceChangeRequest
from students.models import Batch
from faculty.models import Faculty

User = get_user_model()

def test_api():
    print("--- Testing API Change Request ---")
    
    # 1. Setup User
    username = "prof_ai_1"
    try:
        user = User.objects.get(username=username)
        print(f"User: {user.username} (ID: {user.id})")
    except User.DoesNotExist:
        print(f"User {username} not found! Cannot test.")
        return

    client = APIClient()
    client.force_authenticate(user=user)
    
    # 2. Setup Session (Find existing locked one or create)
    # We found 5 locked sessions in previous step. Let's pick one.
    session = AttendanceSession.objects.filter(is_locked=True).first()
    if not session:
        print("No locked sessions found. Creating one...")
        # Need batch
        batch = Batch.objects.first()
        session = AttendanceSession.objects.create(
            batch=batch,
            date="2024-01-22",
            period=1,
            is_locked=True,
            faculty=user.faculty_profile
        )
    
    print(f"Target Session: {session.id} ({session}) status: Locked={session.is_locked}")
    
    # 3. Request Change
    url = "/api/change-requests/"
    data = {
        "session": session.id,
        "reason": "Test Request from Script"
    }
    
    print("Sending POST to", url, data)
    response = client.post(url, data)
    
    print(f"Response Status: {response.status_code}")
    print(f"Response Data: {response.data}")
    
    if response.status_code == 201:
        print("Success! Request Created.")
        print(f"DB Count: {AttendanceChangeRequest.objects.count()}")
    else:
        print("Failed!")

if __name__ == "__main__":
    test_api()
