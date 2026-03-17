import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from faculty.models import Department
from students.models import Batch

def seed_departments():
    # These are the hardcoded choices currently in the system
    DEPT_CHOICES = [
        ('AI', 'Artificial Intelligence'),
        ('EEE', 'Electrical & Electronics'),
        ('ECE', 'Electronics & Comm'),
        ('MECH', 'Mechanical'),
        ('CIVIL', 'Civil'),
        ('IOT', 'Internet of Things'),
    ]

    print("Seeding departments...")
    for code, name in DEPT_CHOICES:
        dept, created = Department.objects.get_or_create(
            code=code,
            defaults={'name': name, 'description': f'Department of {name}'}
        )
        if created:
            print(f"Created: {name} ({code})")
        else:
            print(f"Exists: {name} ({code})")

if __name__ == '__main__':
    seed_departments()
