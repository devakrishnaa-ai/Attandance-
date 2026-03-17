
import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from students.models import Student, Batch

User = get_user_model()

DEPARTMENTS = ['AI', 'EEE', 'ECE', 'MECH', 'CIVIL', 'IOT']
SECTIONS = ['A', 'B']

NAMES = [
    "Aarav", "Aditi", "Arjun", "Bhavya", "Chirag", "Diya", "Eshan", "Fatima", "Gaurav", "Hari",
    "Ishaan", "Jiya", "Kabir", "Lakshmi", "Manish", "Neha", "Om", "Priya", "Rahul", "Sneha",
    "Tanvi", "Uday", "Varun", "Yash", "Zoya", "Rohan", "Siddharth", "Kavya", "Ananya", "Vihaan"
]

SURNAMES = [
    "Sharma", "Patel", "Reddy", "Nair", "Iyer", "Khan", "Singh", "Gupta", "Das", "Rao",
    "Kumar", "Verma", "Mehta", "Jain", "Chopra", "Malhotra", "Saxena", "Bhat", "Desai", "Joshi"
]

def populate_students():
    print("--- Populating Students ---")
    
    count = 0
    
    for dept in DEPARTMENTS:
        for sec in SECTIONS:
            try:
                batch = Batch.objects.get(department=dept, section=sec, year=2024)
            except Batch.DoesNotExist:
                print(f"Skipping {dept}-{sec}: Batch not found")
                continue
            
            # Create 15 students per batch
            for i in range(1, 16):
                
                # Generate unique roll number
                roll_number = f"24{dept}{sec}{i:03d}" # e.g., 24AIA001
                
                if Student.objects.filter(roll_number=roll_number).exists():
                    # print(f"Skipping {roll_number}: Exists")
                    continue
                
                first_name = random.choice(NAMES)
                last_name = random.choice(SURNAMES)
                full_name = f"{first_name} {last_name}"
                
                username = roll_number.lower()
                email = f"{username}@gmail.com"
                password = "password123"
                
                # Create User
                try:
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=password,
                        first_name=first_name,
                        last_name=last_name,
                        role='student'
                    )
                except Exception as e:
                    print(f"User creation failed for {username}: {e}")
                    continue
                
                # Create Student Profile
                Student.objects.create(
                    user=user,
                    name=full_name,
                    roll_number=roll_number,
                    batch=batch,
                    email=email,
                    plain_password=password 
                )
                
                count += 1
                # print(f"Created: {full_name} ({roll_number})")
            
            print(f"Filled {dept}-{sec} with students.")

    print(f"\nSuccessfully added {count} new students!")

if __name__ == "__main__":
    populate_students()
