
import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from faculty.models import Faculty, Subject, FacultyAssignment
from students.models import Batch
from django.contrib.auth import get_user_model

User = get_user_model()

DEPARTMENTS = ['AI', 'EEE', 'ECE', 'MECH', 'CIVIL', 'IOT']

def assign_classes():
    print("--- Assigning Faculty to Classes ---")
    
    for dept in DEPARTMENTS:
        print(f"\nProcessing {dept} Department...")
        
        # 1. Get or Create Faculty for this Dept
        username = f"prof_{dept.lower()}_1"
        try:
            user = User.objects.get(username=username)
            faculty = user.faculty_profile
        except User.DoesNotExist:
            print(f"  Faculty {username} not found. Creating...")
            user = User.objects.create_user(username=username, password='password123', email=f'{username}@college.edu', role='faculty', first_name=f"Prof. {dept}", last_name="Teacher")
            faculty = Faculty.objects.create(user=user, department=dept, plain_password='password123')
        
        # 2. Get all Batches for this Dept
        batches = Batch.objects.filter(department=dept)
        if not batches.exists():
            print(f"  No batches found for {dept}. skipping.")
            continue
            
        # 3. Get all Subjects for this Dept
        subjects = Subject.objects.filter(department=dept)
        if not subjects.exists():
            print(f"  No subjects found for {dept}. skipping.")
            continue
            
        # 4. Assign!
        count = 0
        for batch in batches:
            for subject in subjects:
                # Check if exists
                if not FacultyAssignment.objects.filter(faculty=faculty, batch=batch, subject=subject).exists():
                    FacultyAssignment.objects.create(
                        faculty=faculty,
                        batch=batch,
                        subject=subject
                    )
                    count += 1
                    # print(f"  Assigned {faculty} -> {batch} - {subject}")
        
        print(f"  Assigned {count} classes to {faculty.user.get_full_name()}.")

    print("\nAssignment Complete!")

if __name__ == "__main__":
    assign_classes()
