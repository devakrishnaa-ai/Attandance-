from django.core.management.base import BaseCommand
from students.models import Student
from django.utils.text import slugify

class Command(BaseCommand):
    help = 'Backfills email addresses for students who do not have one.'

    def handle(self, *args, **options):
        students_without_email = Student.objects.filter(email__isnull=True) | Student.objects.filter(email='')
        
        count = 0
        for student in students_without_email:
            base_email = f"{slugify(student.name)}@example.com"
            email = base_email
            counter = 1
            
            # Ensure uniqueness
            while Student.objects.filter(email=email).exists():
                email = f"{slugify(student.name)}{counter}@example.com"
                counter += 1
            
            student.email = email
            student.save()
            count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated email for {student.name}: {email}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully backfilled {count} student emails.'))
