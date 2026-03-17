from django.db import models
from students.models import Batch
from faculty.models import Subject, Faculty

class Timetable(models.Model):
    DAYS_OF_WEEK = [
        ('Monday', 'Monday'),
        ('Tuesday', 'Tuesday'),
        ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday'),
        ('Friday', 'Friday'),
        ('Saturday', 'Saturday'),
    ]

    PERIODS = [
        (1, 'Period 1 (9:00 - 10:00)'),
        (2, 'Period 2 (10:00 - 11:00)'),
        (3, 'Period 3 (11:15 - 12:15)'),
        (4, 'Period 4 (12:15 - 1:15)'),
        (5, 'Period 5 (2:00 - 3:00)'),
        (6, 'Period 6 (3:00 - 4:00)'),
        (7, 'Period 7 (4:00 - 5:00)'),
        (8, 'Period 8 (5:00 - 6:00)'),
    ]

    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='timetable_slots')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='timetable_slots')
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='timetable_slots')
    day = models.CharField(max_length=10, choices=DAYS_OF_WEEK)
    period = models.IntegerField(choices=PERIODS)

    class Meta:
        unique_together = ('batch', 'day', 'period') # A class cannot have two subjects at same time
        ordering = ['day', 'period']

    def __str__(self):
        return f"{self.day} P{self.period}: {self.subject} ({self.batch})"
