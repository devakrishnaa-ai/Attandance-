
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from faculty.models import Faculty, FacultyAssignment
from timetable.models import Timetable
from students.models import Batch

def sync_assignments():
    print("--- Syncing Faculty Assignments from Timetable ---")
    
    # Get all unique (Faculty, Subject, Batch) combinations from Timetable
    # logic: If a faculty teaches Subject S to Batch B in the timetable, 
    # they should have an assignment for it.
    
    timetable_entries = Timetable.objects.select_related('faculty', 'subject', 'batch').all()
    
    unique_links = set()
    for entry in timetable_entries:
        if entry.faculty and entry.subject and entry.batch:
            unique_links.add((entry.faculty, entry.subject, entry.batch))
            
    print(f"Found {len(unique_links)} unique teaching relationships in Timetable.")
    
    created_count = 0
    existing_count = 0
    
    for faculty, subject, batch in unique_links:
        assignment, created = FacultyAssignment.objects.get_or_create(
            faculty=faculty,
            subject=subject,
            batch=batch
        )
        
        if created:
            created_count += 1
            print(f"[NEW] Assigned {subject.name} to {faculty.user.username} for {batch}")
        else:
            existing_count += 1
            
    print(f"\nSync Complete.")
    print(f"Created {created_count} new assignments.")
    print(f"Found {existing_count} existing assignments.")

if __name__ == "__main__":
    sync_assignments()
