
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from faculty.models import Faculty, Department

User = get_user_model()

def create_hod_user():
    username = "hod_ai"
    email = "hod.ai@college.edu"
    password = "password123"
    dept_code = "AI"

    print(f"Creating HOD user for {dept_code}...")

    # 1. Create or Get User
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'role': 'hod',
            'is_staff': False,
            'is_superuser': False
        }
    )
    
    if created:
        user.set_password(password)
        user.save()
        print(f"User '{username}' created with password '{password}'")
    else:
        # Check role
        if user.role != 'hod':
             user.role = 'hod'
             user.save()
             print(f"User '{username}' role updated to 'hod'.")
        print(f"User '{username}' already exists. Resetting password to '{password}'")
        user.set_password(password)
        user.save()

    # 2. Create Faculty Profile
    faculty, created = Faculty.objects.get_or_create(
        user=user,
        defaults={
            'department': dept_code,
            'phone_number': '9999999999',
            'plain_password': password 
        }
    )
    if not created:
         faculty.department = dept_code
         faculty.save()

    # 3. Assign as HOD of Department
    try:
        department = Department.objects.get(code=dept_code)
        department.head_of_department = faculty
        department.save()
        print(f"Assigned '{username}' as Head of Department for {department.name}")
    except Department.DoesNotExist:
        print(f"Error: Department {dept_code} does not exist!")

if __name__ == '__main__':
    create_hod_user()
