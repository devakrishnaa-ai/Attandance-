import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

def test_api():
    print("--- Testing API Permissions ---")
    try:
        user = User.objects.get(username='admin')
        print(f"Found User: {user.username}, Role: {getattr(user, 'role', 'N/A')}, Staff: {user.is_staff}")
    except User.DoesNotExist:
        print("Admin user not found!")
        return

    client = APIClient()
    client.force_authenticate(user=user)
    
    print("\nAttempting GET /api/subjects/")
    response = client.get('/api/subjects/')
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data}")
    
    if response.status_code == 403:
        print("\nPERMISSIONS ERROR: Still getting 403 Forbidden.")
    elif response.status_code == 200:
        print("\nSUCCESS: API is accessible.")
    else:
        print(f"\nERROR: Unexpected status {response.status_code}")

if __name__ == '__main__':
    test_api()
