import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from students.models import Batch

DEPARTMENTS = ['AI', 'EEE', 'ECE', 'MECH', 'CIVIL', 'IOT']
SECTIONS = ['A', 'B']

created_count = 0
for dept in DEPARTMENTS:
    for section in SECTIONS:
        batch, created = Batch.objects.get_or_create(
            department=dept,
            section=section,
            year=2024,
            defaults={'name': f"{dept}-{section} (2024)"}
        )
        if created:
            print(f"Created Batch: {batch}")
            created_count += 1
        else:
            print(f"Batch already exists: {batch}")

print(f"\nTotal Batches Created: {created_count}")
