from django.db import models

class Batch(models.Model):
    DEPT_CHOICES = [
        ('AI', 'Artificial Intelligence'),
        ('EEE', 'Electrical & Electronics'),
        ('ECE', 'Electronics & Comm'),
        ('MECH', 'Mechanical'),
        ('CIVIL', 'Civil'),
        ('IOT', 'Internet of Things'),
    ]
    SECTION_CHOICES = [('A', 'A'), ('B', 'B')]

    name = models.CharField(max_length=100, blank=True) # Kept for backward compat or manual override
    # Relaxed constraints to support dynamic departments and sections
    department = models.CharField(max_length=10) 
    section = models.CharField(max_length=1)
    year = models.IntegerField(default=2024)
    
    class Meta:
        unique_together = ('department', 'section', 'year')

    def __str__(self):
        return f"{self.department} - {self.section} ({self.year})"

class Student(models.Model):
    name = models.CharField(max_length=200)
    roll_number = models.CharField(max_length=50, unique=True)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='students')
    email = models.EmailField(unique=True)
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, null=True, blank=True, related_name='student_profile')
    plain_password = models.CharField(max_length=100, blank=True, null=True)
    profile_photo = models.ImageField(upload_to='student_photos/', blank=True, null=True)
    
    def __str__(self):
        return f"{self.name} ({self.roll_number})"
