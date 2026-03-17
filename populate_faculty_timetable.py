
import os
import django
import random
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from faculty.models import Faculty, Subject
from students.models import Batch
from timetable.models import Timetable

User = get_user_model()

DEPARTMENTS = ['AI', 'EEE', 'ECE', 'MECH', 'CIVIL', 'IOT']
SECTIONS = ['A', 'B']
DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

def create_batches():
    print("--- Creating Batches ---")
    created_count = 0
    for dept in DEPARTMENTS:
        for sec in SECTIONS:
            batch, created = Batch.objects.get_or_create(
                department=dept,
                section=sec,
                year=2024,
                defaults={'name': f"{dept} - {sec} (2024)"}
            )
            if created:
                print(f"Created Batch: {batch}")
                created_count += 1
    print(f"Batches populated. New: {created_count}")

def create_faculty():
    print("\n--- Creating Faculty ---")
    faculty_list = []
    
    for dept in DEPARTMENTS:
        # Create 2 faculty per dept
        for i in range(1, 3):
            username = f"prof_{dept.lower()}_{i}"
            email = f"{username}@university.edu"
            
            if not User.objects.filter(username=username).exists():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password="password123",
                    first_name=f"Prof. {dept} {i}",
                    last_name="Staff",
                    role='faculty'
                )
                fac = Faculty.objects.create(
                    user=user,
                    department=dept,
                    phone_number="1234567890"
                )
                print(f"Created Faculty: {user.get_full_name()} ({dept})")
                faculty_list.append(fac)
            else:
                print(f"Skipped: {username} exists")
                fac = Faculty.objects.get(user__username=username)
                faculty_list.append(fac)
    
    return faculty_list

def create_timetable(faculty_list):
    print("\n--- Creating Timetable ---")
    Timetable.objects.all().delete() # Clear existing for fresh start
    print("Cleared existing timetable.")
    
    count = 0
    
    for dept in DEPARTMENTS:
        dept_subjects = Subject.objects.filter(department=dept)
        dept_faculty = [f for f in faculty_list if f.department == dept]
        
        if not dept_subjects.exists() or not dept_faculty:
            continue
            
        for sec in SECTIONS:
            try:
                batch = Batch.objects.get(department=dept, section=sec, year=2024)
            except Batch.DoesNotExist:
                continue
                
            # For each day, assign 4-5 random periods
            for day in DAYS:
                periods = random.sample(PERIODS, k=random.randint(4, 6))
                for p in periods:
                    subject = random.choice(dept_subjects)
                    faculty = random.choice(dept_faculty)
                    
                    # check conflict (Faculty busy elsewhere?)
                    if Timetable.objects.filter(faculty=faculty, day=day, period=p).exists():
                        continue
                        
                    Timetable.objects.create(
                        batch=batch,
                        subject=subject,
                        faculty=faculty,
                        day=day,
                        period=p
                    )
                    count += 1
                    
    print(f"Timetable populated with {count} slots.")

if __name__ == "__main__":
    create_batches()
    fac_list = create_faculty()
    create_timetable(fac_list)
    print("\nDone! Log in as 'prof_ai_1' / 'password123' to test faculty view.")
