from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from backend.permissions import IsAdminRole
from .models import Timetable
from .serializers import TimetableSerializer
from django.db.models import Q

class TimetableViewSet(viewsets.ModelViewSet):
    serializer_class = TimetableSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Timetable.objects.all()
        
        # 1. Base Role-based Filtering
        if getattr(user, 'role', '') == 'admin' or user.is_staff or user.is_superuser:
            pass # Admin sees all
        elif getattr(user, 'role', '') == 'faculty':
            queryset = queryset.filter(faculty__user=user)
        elif getattr(user, 'role', '') == 'student':
            if hasattr(user, 'student_profile'):
                queryset = queryset.filter(batch=user.student_profile.batch)
            else:
                return Timetable.objects.none()
        else:
             return Timetable.objects.none()

        # 2. Common Filters (Apply to all roles)
        batch_id = self.request.query_params.get('batch_id')
        day = self.request.query_params.get('day')
        period = self.request.query_params.get('period')
        
        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)
        if day:
            queryset = queryset.filter(day__iexact=day) # Case insensitive for 'Monday' vs 'monday'
        if period:
             queryset = queryset.filter(period=period)
             
        return queryset

    def create(self, request, *args, **kwargs):
        # Only Admin can create
        if getattr(request.user, 'role', '') != 'admin' and not request.user.is_staff and not request.user.is_superuser:
             return Response({"error": "Only Admins can manage timetable"}, status=403)

        data = request.data
        faculty_id = data.get('faculty')
        day = data.get('day')
        period = data.get('period')
        batch_id = data.get('batch')
        
        # Check Faculty Conflict
        if Timetable.objects.filter(faculty_id=faculty_id, day=day, period=period).exists():
            return Response({"error": "Faculty is already assigned to another class at this time!"}, status=400)
            
        # Check Batch Conflict (Handled by unique_together, but custom message is nicer)
        if Timetable.objects.filter(batch_id=batch_id, day=day, period=period).exists():
            return Response({"error": "This class already has a subject at this time!"}, status=400)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') != 'admin' and not request.user.is_staff and not request.user.is_superuser:
             return Response({"error": "Only Admins can manage timetable"}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') != 'admin' and not request.user.is_staff and not request.user.is_superuser:
             return Response({"error": "Only Admins can manage timetable"}, status=403)
        return super().destroy(request, *args, **kwargs)
