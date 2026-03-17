from django.db import models
from django.conf import settings
from students.models import Batch

class Department(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True, null=True)
    head_of_department = models.OneToOneField(
        'Faculty', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='hod_of'
    )

    def __str__(self):
        return f"{self.name} ({self.code})"

class Subject(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    department = models.CharField(max_length=10) # Dynamic link to Department code

    semester = models.IntegerField(default=1)
    credits = models.IntegerField(default=3)
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class Faculty(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='faculty_profile')
    department = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    plain_password = models.CharField(max_length=100, blank=True, null=True)
    
    def __str__(self):
        return self.user.get_full_name() or self.user.username

class FacultyAssignment(models.Model):
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='assignments')
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='faculty_assignments')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='assignments')
    
    class Meta:
        unique_together = ('faculty', 'batch', 'subject')
    
    def __str__(self):
        return f"{self.faculty} - {self.subject} ({self.batch})"
