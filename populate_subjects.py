
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from faculty.models import Subject

subjects_data = [
    # AI Dept
    {"name": "Introduction to AI", "code": "AI101", "department": "AI", "semester": 1, "credits": 3},
    {"name": "Data Structures", "code": "AI102", "department": "AI", "semester": 2, "credits": 4},
    {"name": "Machine Learning", "code": "AI201", "department": "AI", "semester": 3, "credits": 4},
    {"name": "Deep Learning", "code": "AI301", "department": "AI", "semester": 5, "credits": 4},
    {"name": "Natural Language Processing", "code": "AI401", "department": "AI", "semester": 7, "credits": 3},

    # EEE Dept
    {"name": "Circuit Theory", "code": "EE101", "department": "EEE", "semester": 1, "credits": 4},
    {"name": "Power Systems", "code": "EE201", "department": "EEE", "semester": 3, "credits": 4},
    {"name": "Control Systems", "code": "EE301", "department": "EEE", "semester": 5, "credits": 3},

    # ECE Dept
    {"name": "Digital Electronics", "code": "EC101", "department": "ECE", "semester": 2, "credits": 4},
    {"name": "Signals and Systems", "code": "EC201", "department": "ECE", "semester": 3, "credits": 4},
    {"name": "Microprocessors", "code": "EC301", "department": "ECE", "semester": 4, "credits": 4},

    # MECH Dept
    {"name": "Thermodynamics", "code": "ME101", "department": "MECH", "semester": 2, "credits": 4},
    {"name": "Fluid Mechanics", "code": "ME201", "department": "MECH", "semester": 3, "credits": 4},
    {"name": "Kinematics of Machines", "code": "ME301", "department": "MECH", "semester": 4, "credits": 3},

    # CIVIL Dept
    {"name": "Engineering Mechanics", "code": "CV101", "department": "CIVIL", "semester": 1, "credits": 4},
    {"name": "Structural Analysis", "code": "CV201", "department": "CIVIL", "semester": 3, "credits": 4},

    # IOT Dept
    {"name": "Embedded Systems", "code": "IOT101", "department": "IOT", "semester": 3, "credits": 4},
    {"name": "Sensors and Actuators", "code": "IOT201", "department": "IOT", "semester": 4, "credits": 3},
    {"name": "Wireless Sensor Networks", "code": "IOT301", "department": "IOT", "semester": 5, "credits": 3},
]

print("Populating subjects...")
count = 0
for data in subjects_data:
    obj, created = Subject.objects.get_or_create(
        code=data['code'],
        defaults=data
    )
    if created:
        print(f"Created: {data['name']} ({data['code']})")
        count += 1
    else:
        print(f"Skipped (Exists): {data['name']}")

print(f"Done! Added {count} new subjects.")
