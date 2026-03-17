
import os
import django
import random
from collections import defaultdict

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from faculty.models import Faculty, Subject, FacultyAssignment
from students.models import Batch
from timetable.models import Timetable

User = get_user_model()

DEPARTMENTS = ['AI', 'EEE', 'ECE', 'MECH', 'CIVIL', 'IOT']
SECTIONS = ['A', 'B']  # , 'C'] # Stick to A/B for now to match UI
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

FACULTY_PER_DEPT = 4  # Enough to cover 2 sections * 8 periods = 16 periods/day easily among 4 people (4 periods each)

def get_or_create_full_faculty():
    print("--- Ensuring Sufficient Faculty ---")
    faculty_cache = defaultdict(list)
    
    for dept in DEPARTMENTS:
        # Create at least N faculty
        for i in range(1, FACULTY_PER_DEPT + 1):
            username = f"prof_{dept.lower()}_{i}"
            email = f"{username}@university.edu"
            
            if not User.objects.filter(username=username).exists():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password="password123", # Default password
                    first_name=f"Dr. {dept}",
                    last_name=f"Factor {i}",
                    role='faculty'
                )
                fac = Faculty.objects.create(
                    user=user,
                    department=dept,
                    phone_number=f"555-{dept[:3]}-{i:04d}"
                )
                print(f"Created: {username}")
                faculty_cache[dept].append(fac)
            else:
                fac = Faculty.objects.get(user__username=username)
                faculty_cache[dept].append(fac)
    
    print("Faculty pool ready.")
    return faculty_cache

def assign_subjects_to_faculty(faculty_cache):
    print("--- Assigning Subjects (Assignments) ---")
    # This is mainly for the "My Students" view, but Timetable drives the main logic
    # We will just ensure every faculty has 'access' to their department batches
    pass 

def create_full_timetable(faculty_cache):
    print("--- Generating Full 100% Occupancy Timetable ---")
    Timetable.objects.all().delete()
    print("Cleared existing timetable.")
    
    total_slots = 0
    
    # Track Faculty Daily Load: { faculty_id: { day: count } }
    faculty_load = defaultdict(lambda: defaultdict(int))
    
    for dept in DEPARTMENTS:
        dept_subjects = list(Subject.objects.filter(department=dept))
        if not dept_subjects:
            print(f"WARNING: No subjects for {dept}. Skipping.")
            continue
            
        dept_faculty = faculty_cache[dept]
        
        for sec in SECTIONS:
            # Handle potential duplicates or missing year
            batch = Batch.objects.filter(department=dept, section=sec, year=2024).first()
            
            if not batch:
                # auto create if missing
                batch = Batch.objects.create(department=dept, section=sec, year=2024, name=f"{dept}-{sec} (2024)")
                print(f"Created missing batch: {batch}")

            print(f"Scheduling for {batch}...")
            
            subject_cycler = 0
            
            for day in DAYS:
                for period in PERIODS:
                    # Round Robin Subjects
                    subject = dept_subjects[subject_cycler % len(dept_subjects)]
                    subject_cycler += 1
                    
                    # Find a valid Faculty
                    # Constraints:
                    # 1. Dept matches
                    # 2. Not already teaching this Day+Period (Conflict)
                    # 3. Daily Load < 7
                    
                    assigned_fac = None
                    random.shuffle(dept_faculty) # Randomize to distribute load
                    
                    for fac in dept_faculty:
                        # Check Workload
                        if faculty_load[fac.id][day] >= 7:
                            continue
                            
                        # Check Conflict
                        # Note: We are building sequentially, so we can check our local map or DB
                        # Checking DB is safer but slower. Let's check DB for cross-batch conflicts.
                        if Timetable.objects.filter(faculty=fac, day=day, period=period).exists():
                            continue
                        
                        assigned_fac = fac
                        break
                    
                    if assigned_fac:
                        Timetable.objects.create(
                            batch=batch,
                            subject=subject,
                            faculty=assigned_fac,
                            day=day,
                            period=period
                        )
                        faculty_load[assigned_fac.id][day] += 1
                        total_slots += 1
                    else:
                        print(f"  [!] CRITICAL: Could not find faculty for {batch} {day} P{period}. Need more faculty!")
                        
    print(f"\nCompleted! Generated {total_slots} slots.")
    print("Every batch should now be fully occupied (Monday-Saturday, 8 Periods).")

if __name__ == "__main__":
    fac_cache = get_or_create_full_faculty()
    create_full_timetable(fac_cache)
