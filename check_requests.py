
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from attendance.models import AttendanceChangeRequest, AttendanceSession
from django.contrib.auth import get_user_model

User = get_user_model()

def check_requests():
    print("--- Checking Change Requests ---")
    requests = AttendanceChangeRequest.objects.all()
    print(f"Total Requests Found: {requests.count()}")
    
    for req in requests:
        print(f"ID: {req.id} | Faculty: {req.requested_by.user.username} | Status: {req.status} | Reason: {req.reason}")
        print(f"  Session: {req.session} | Locked? {req.session.is_locked}")

    print("\n--- Checking Sessions ---")
    sessions = AttendanceSession.objects.all()
    print(f"Total Sessions: {sessions.count()}")
    locked_sessions = sessions.filter(is_locked=True)
    print(f"Locked Sessions: {locked_sessions.count()}")

if __name__ == "__main__":
    check_requests()
