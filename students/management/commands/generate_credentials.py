from django.core.management.base import BaseCommand
from students.models import Student
from django.contrib.auth import get_user_model
import secrets
import string
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Generate or Update credentials for students to match the new username format'

    def handle(self, *args, **kwargs):
        students = Student.objects.all()
        count = 0
        updated = 0
        
        self.stdout.write("Starting credential update process...")

        for student in students:
            try:
                # 1. Ensure User Exists
                if not student.user:
                    self.stdout.write(f"Creating user for {student.name}...")
                    password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
                    
                    # Temporary username, will be fixed in step 2
                    temp_username = f"temp_{secrets.token_hex(4)}"
                    user = User.objects.create_user(username=temp_username, password=password, email=student.email)
                    student.user = user
                    student.plain_password = password
                    student.save()
                
                user = student.user
                
                # 2. Calculate New Username (Format: name, no numbers unless collision)
                base_username = student.name.lower().replace(" ", "")
                new_username = base_username
                counter = 1
                
                # Check availability (excluding self)
                while User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
                    new_username = f"{base_username}{counter}"
                    counter += 1
                
                # 3. Apply Update if needed
                if user.username != new_username:
                    self.stdout.write(f"  > Renaming {student.name}: '{user.username}' -> '{new_username}'")
                    user.username = new_username
                    user.save()
                    updated += 1
                
                # 4. Ensure Password (Backfill if missing)
                if not student.plain_password:
                    password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
                    user.set_password(password)
                    user.save()
                    student.plain_password = password
                    student.save()
                    self.stdout.write(f"  > Generated missing password for {student.name}")

                count += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing {student.name}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\nCompleted. Processed {count} students. Updated {updated} usernames."))
