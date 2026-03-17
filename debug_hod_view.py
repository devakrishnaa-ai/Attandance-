
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from faculty.models import Faculty, Department
from students.models import Student, Batch
from attendance.models import Attendance

User = get_user_model()

def check_hod_access(username='hod_ai'):
    print(f"--- Checking Access for {username} ---")
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        print(f"User {username} not found!")
        return

    print(f"Role: {user.role}")
    
    if not hasattr(user, 'faculty_profile'):
        print("Error: No Faculty Profile found.")
        return
    
    fac = user.faculty_profile
    print(f"Faculty Dept: {fac.department}")
    
    try:
        hod_dept = fac.hod_of
        print(f"HOD of: {hod_dept.name} ({hod_dept.code})")
        dept_code = hod_dept.code
    except Exception as e:
        print(f"Error accessing hod_of: {e}")
        return

    # 1. Check Student Visibility
    visible_students = Student.objects.filter(batch__department=dept_code).count()
    total_students = Student.objects.count()
    print(f"Visible Students: {visible_students} / {total_students}")
    
    if visible_students == 0:
        print("WARNING: No students found for this HOD. Checking Batch data...")
        batches = Batch.objects.filter(department=dept_code)
        if not batches.exists():
            print(f"  No batches found with department='{dept_code}'")
            all_batches = Batch.objects.all()
            print("  Available Batches:", [(b.department, b.name) for b in all_batches])
        else:
            print(f"  Batches found: {batches.count()}")

    # 2. Check Faculty Visibility
    visible_faculty = Faculty.objects.filter(department__iexact=dept_code).count() # Or similar query
    print(f"Visible Faculty: {visible_faculty}")

    # 3. Check Attendance Visibility
    visible_attendance = Attendance.objects.filter(student__batch__department=dept_code).count()
    print(f"Visible Attendance Records: {visible_attendance}")

if __name__ == '__main__':
    check_hod_access()
