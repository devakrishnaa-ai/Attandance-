from rest_framework import serializers
from .models import Timetable
from faculty.models import Subject, Faculty

class TimetableSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    faculty_name = serializers.SerializerMethodField()
    batch_name = serializers.CharField(source='batch.name', read_only=True)
    
    class Meta:
        model = Timetable
        fields = ['id', 'batch', 'batch_name', 'subject', 'subject_name', 'faculty', 'faculty_name', 'day', 'period']
        
    def get_faculty_name(self, obj):
        return obj.faculty.user.get_full_name() or obj.faculty.user.username

    def validate(self, data):
        """
        Check if Faculty is already assigned to another class (Batch) for the same Day & Period.
        """
        faculty = data.get('faculty')
        day = data.get('day')
        period = data.get('period')
        
        # NOTE: data.get() might return None if partial update, but simplified for Create/Full Update
        # Ideally, merge with self.instance values if not present in data
        
        if self.instance:
            faculty = faculty or self.instance.faculty
            day = day or self.instance.day
            period = period or self.instance.period

        # 1. Workload Limit Check (Max 7 Periods per Day)
        daily_qs = Timetable.objects.filter(faculty=faculty, day=day)
        if self.instance:
            daily_qs = daily_qs.exclude(pk=self.instance.pk)
            
        daily_count = daily_qs.count()
        if daily_count >= 7:
             raise serializers.ValidationError(
                f"Workload Limit: Faculty '{faculty.user.get_full_name() or faculty.user.username}' "
                f"already has {daily_count} periods on {day}. Max allowed is 7."
            )

        # 2. Conflict Query
        qs = Timetable.objects.filter(faculty=faculty, day=day, period=period)
        
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
            
        if qs.exists():
            conflict = qs.first()
            raise serializers.ValidationError(
                f"Faculty '{faculty.user.get_full_name() or faculty.user.username}' is already conducting a class for "
                f"'{conflict.batch}' on {day} Period {period}."
            )
        
        return data
