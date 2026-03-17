from django.db import models
from django.conf import settings
from students.models import Student, Batch
from faculty.models import Subject, Faculty

class AttendanceSession(models.Model):
    date = models.DateField()
    period = models.IntegerField()
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True, blank=True)
    faculty = models.ForeignKey(Faculty, on_delete=models.SET_NULL, null=True)
    
    is_locked = models.BooleanField(default=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # If unlocked, until when?
    unlocked_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('date', 'period', 'batch')

    def __str__(self):
        return f"{self.batch} - {self.date} (Period {self.period})"
    
    @property
    def is_editable(self):
        from django.utils import timezone
        if not self.is_locked:
            if self.unlocked_until and timezone.now() < self.unlocked_until:
                return True
        return False

class Attendance(models.Model):
    STATUS_CHOICES = (
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('OD', 'On Duty'),
    )
    
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='records', null=True, blank=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    period = models.IntegerField(default=1)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='present')
    marked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'date', 'period') # One record per student per period per day
        ordering = ['-date', 'student__roll_number']

    def __str__(self):
        return f"{self.student.name} - {self.date} - {self.status}"

class AttendanceChangeRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='change_requests')
    requested_by = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    
    admin_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Request for {self.session} by {self.requested_by}"
