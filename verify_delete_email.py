import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from students.models import Student, Batch
from django.core import mail
from django.core.mail.backends.smtp import EmailBackend

def test_delete_email():
    print("--- Verifying Delete Notification ---")
    
    # ensure a batch exists
    batch, _ = Batch.objects.get_or_create(name="TestBatch", year=2024)

    # Create a dummy student (this will trigger a welcome email, ignore it)
    email = "delete.test.user@gmail.com"
    
    # Clean up if exists from previous run
    Student.objects.filter(email=email).delete()
    
    print(f"Creating student with email: {email}")
    student = Student.objects.create(
        name="Delete Tester",
        roll_number="999888",
        email=email,
        batch=batch
    )
    print("Student created.")
    
    # Clear outbox (if mocking) but we are using real SMTP so we can't clear it.
    # We will just rely on the print statement in the signal or console.
    
    print(f"Deleting student: {student.name}")
    student.delete()
    
    print("Student deleted. Check your console for 'Delete notification sent...'")
    print("Ensure you received an email at the specified address if using real SMTP.")

if __name__ == "__main__":
    test_delete_email()
