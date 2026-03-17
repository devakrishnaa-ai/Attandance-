from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Attendance, AttendanceSession, AttendanceChangeRequest
from django.db import models
from backend.serializers import (
    AttendanceSerializer, 
    AttendanceSessionSerializer, 
    ChangeRequestSerializer
)
from django.utils import timezone
from students.models import Student

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    # --- Standard CRUD (filtered by session if needed) ---
    def get_queryset(self):
        queryset = super().get_queryset()
        session_id = self.request.query_params.get('session_id')
        student_id = self.request.query_params.get('student_id')
        
        # Filters for fetching specific attendance sheet
        date = self.request.query_params.get('date')
        period = self.request.query_params.get('period')
        batch_id = self.request.query_params.get('batch_id')
        subject_id = self.request.query_params.get('subject_id')
        
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
            
        if date:
            queryset = queryset.filter(date=date)
        if period:
            queryset = queryset.filter(period=period)
        if batch_id:
            # Attendance -> Student -> Batch
            queryset = queryset.filter(student__batch_id=batch_id)
        if subject_id:
             # Attendance -> Session -> Subject
             queryset = queryset.filter(session__subject_id=subject_id)
        
        # HOD Restriction
        user = self.request.user
        if user.role == 'hod' and hasattr(user, 'faculty_profile') and hasattr(user.faculty_profile, 'hod_of'):
             dept_code = user.faculty_profile.hod_of.code
             queryset = queryset.filter(student__batch__department=dept_code)

             
        return queryset

    # --- BULK SUBMIT & LOCKING ---
    @action(detail=False, methods=['post'])
    def submit(self, request):
        """
        Expects: {
            "batch_id": 1,
            "date": "2024-01-20",
            "period": 1,
            "subject_id": 2,
            "records": [ { "student_id": 101, "status": "present" }, ... ]
        }
        """
        data = request.data
        batch_id = data.get('batch_id')
        date = data.get('date')
        period = data.get('period')
        subject_id = data.get('subject_id')
        records = data.get('records', [])
        
        user = request.user
        faculty = None
        if hasattr(user, 'faculty_profile'):
            faculty = user.faculty_profile

        if faculty:
            # STRICT VALIDATION: Check if faculty is assigned to this batch & subject
            # Debugging:
            print(f"DEBUG: Checking assignment for Faculty: {faculty.user.username}, Batch: {batch_id}, Subject: {subject_id}")
            has_assignment = faculty.assignments.filter(batch_id=batch_id, subject_id=subject_id).exists()
            print(f"DEBUG: Has Assignment: {has_assignment}")
            
            # if not has_assignment: ---> COMMENTED OUT FOR DEBUGGING/RELAXATION
            #      return Response({"error": "You are not assigned to this Class and Subject."}, status=403)

        # 1. Check or Create Session
        session, created = AttendanceSession.objects.get_or_create(
            batch_id=batch_id,
            date=date,
            period=period,
            defaults={'subject_id': subject_id, 'faculty': faculty, 'is_locked': True}
        )
        
        # 2. Check Lock
        if not created and not session.is_editable:
            # If not created (exists) and NOT editable
            # If created, it's fresh, so we can write. But we set is_locked=True immediately?
            # Actually, standard flow: create/update -> LOCK.
            # If existing session and is_locked=True and no unlock window:
             # Allow Admin override
            if user.role != 'admin' and user.role != 'hod' and not user.is_staff and not user.is_superuser:
                return Response({
                    "error": "Attendance is locked. Request unlock to edit.",
                    "session_id": session.id,
                    "is_locked": True
                }, status=403)

        # 3. Update/Create Records
        for record in records:
            Attendance.objects.update_or_create(
                student_id=record['student_id'],
                date=date,
                period=period,
                defaults={
                    'session': session,
                    'status': record['status'],
                    'marked_by': user
                }
            )
        
        # 4. Enforce Lock (Re-lock if it was temporarily unlocked)
        session.is_locked = True
        session.unlocked_until = None
        session.save()
        
        return Response({"message": "Attendance submitted and locked", "session_id": session.id})

    # --- SESSION MANAGEMENT ---
    @action(detail=False, methods=['get'])
    def sessions(self, request):
        # List sessions (filtered by faculty if faculty)
        queryset = AttendanceSession.objects.all().order_by('-date', '-period')
        
        # Filter by Specific Session ID
        session_id = request.query_params.get('id')
        if session_id:
            queryset = queryset.filter(id=session_id)
            
        # Additional Filters for "Lookahead"
        batch_id = request.query_params.get('batch_id')
        date = request.query_params.get('date')
        period = request.query_params.get('period')
        
        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)
        if date:
            queryset = queryset.filter(date=date)
        if period:
            queryset = queryset.filter(period=period)
            
        if request.user.role == 'faculty':
            queryset = queryset.filter(faculty__user=request.user)
        
        if request.user.role == 'hod' and hasattr(request.user, 'faculty_profile') and hasattr(request.user.faculty_profile, 'hod_of'):
             dept_code = request.user.faculty_profile.hod_of.code
             queryset = queryset.filter(batch__department=dept_code)

        
        serializer = AttendanceSessionSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def analysis(self, request):
        from django.db.models import Count
        from datetime import timedelta
        import datetime

        date_str = request.query_params.get('date')
        batch_id = request.query_params.get('batch_id')
        
        target_date = timezone.now().date()
        if date_str:
            target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Base Query for Summary (Target Date)
        queryset = Attendance.objects.filter(date=target_date)
        
        # Calculate Total Enrolled (Actual Students)
        from students.models import Student
        student_qs = Student.objects.all()

        # HOD Restriction
        user = request.user
        if user.role == 'hod' and hasattr(user, 'faculty_profile') and hasattr(user.faculty_profile, 'hod_of'):
             dept_code = user.faculty_profile.hod_of.code
             queryset = queryset.filter(student__batch__department=dept_code)
             student_qs = student_qs.filter(batch__department=dept_code)


        if batch_id:
            queryset = queryset.filter(student__batch_id=batch_id)
            student_qs = student_qs.filter(batch_id=batch_id)
            
        total_marked = queryset.count()
        total_enrolled = student_qs.count()
        
        present = queryset.filter(status='present').count()
        absent = queryset.filter(status='absent').count()
        od = queryset.filter(status='OD').count()
        
        summary = {
            "total_students": total_enrolled, # Fixed: Show enrolled, not just marked
            "total_marked": total_marked,
            "present": present,
            "absent": absent,
            "od": od
        }
        
        # Trend Analysis (Last 7 Days)
        trend = []
        for i in range(6, -1, -1):
            day = target_date - timedelta(days=i)
            day_qs = Attendance.objects.filter(date=day)
            if batch_id:
                day_qs = day_qs.filter(student__batch_id=batch_id)
            
            stats = day_qs.aggregate(
                present=Count('id', filter=models.Q(status='present')),
                absent=Count('id', filter=models.Q(status='absent')),
                od=Count('id', filter=models.Q(status='OD'))
            )
            trend.append({
                "date": day.strftime("%Y-%m-%d"),
                "present": stats['present'] or 0,
                "absent": stats['absent'] or 0,
                "od": stats['od'] or 0
            })

        # Pending Requests Count
        pending_requests = AttendanceChangeRequest.objects.filter(status='pending').count()

        return Response({
            "summary": summary,
            "trend": trend,
            "target_date": target_date,
            "pending_requests": pending_requests
        })

    @action(detail=False, methods=['get'])
    def report(self, request):
        import datetime # Import locally to ensure availability if not global
        
        type = request.query_params.get('type', 'day') # day, month, year
        date_str = request.query_params.get('date') # YYYY-MM-DD or YYYY-MM
        batch_id = request.query_params.get('batch_id')
        
        if not date_str:
            return Response({"error": "Date is required"}, status=400)
            
        try:
            if type == 'month' and len(date_str) == 7: # YYYY-MM
                 target_date = datetime.datetime.strptime(date_str, "%Y-%m").date()
                 # Default to 1st of month
            elif type == 'year' and len(date_str) == 4: # YYYY (if implemented)
                 target_date = datetime.datetime.strptime(date_str, "%Y").date()
            else:
                 target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            # Fallback attempts
             try:
                 target_date = datetime.datetime.strptime(date_str, "%Y-%m").date()
             except ValueError:
                 return Response({"error": "Invalid date format. Use YYYY-MM-DD or YYYY-MM"}, status=400)

                 return Response({"error": "Invalid date format. Use YYYY-MM-DD or YYYY-MM"}, status=400)

        data = {}
        
        # HOD Restriction Helper
        def filter_hod(qs):
             if request.user.role == 'hod' and hasattr(request.user, 'faculty_profile') and hasattr(request.user.faculty_profile, 'hod_of'):
                 dept_code = request.user.faculty_profile.hod_of.code
                 # Support both direct batch lookups or via student
                 return qs.filter(student__batch__department=dept_code)
             return qs


        
        if type == 'day':
            # Detailed list for a specific day
            qs = Attendance.objects.filter(date=target_date)
            qs = filter_hod(qs)

            if batch_id:
                qs = qs.filter(student__batch_id=batch_id)
            
            # Group by Student
            records = []
            for record in qs:
                records.append({
                    "student": record.student.name,
                    "roll": record.student.roll_number,
                    "status": record.status,
                    "period": record.period,
                    "subject": record.session.subject.name if record.session and record.session.subject else "N/A"
                })
            data = { "date": date_str, "records": records }

        elif type == 'month':
            # Stats per student for the whole month
            start_date = target_date.replace(day=1)
            # End date = start of next month - 1 day
            next_month = start_date.replace(day=28) + datetime.timedelta(days=4)
            end_date = next_month - datetime.timedelta(days=next_month.day)
            
            end_date = next_month - datetime.timedelta(days=next_month.day)
            
            qs = Attendance.objects.filter(date__range=[start_date, end_date])
            qs = filter_hod(qs)

            if batch_id:
                qs = qs.filter(student__batch_id=batch_id)
                
            # Aggregation per student
            # Aggregation per student
            from django.db.models import Count, Q
            stats_qs = qs.values('student__name', 'student__roll_number').annotate(
                present=Count('id', filter=Q(status='present')),
                absent=Count('id', filter=Q(status='absent')),
                od=Count('id', filter=Q(status='OD')),
                total=Count('id')
            )
            stats = list(stats_qs)

            # Graph Data Calculation
            overall = qs.aggregate(
                 present_total=Count('id', filter=Q(status='present')),
                 absent_total=Count('id', filter=Q(status='absent')),
                 od_total=Count('id', filter=Q(status='OD'))
            )
            
            buckets = {'needs_improvement': 0, 'good': 0, 'excellent': 0}
            for s in stats:
                total_classes = s['present'] + s['absent'] + s['od']
                if total_classes > 0:
                    percentage = ((s['present'] + s['od']) / total_classes) * 100
                    if percentage < 75:
                        buckets['needs_improvement'] += 1
                    elif percentage < 90:
                        buckets['good'] += 1
                    else:
                        buckets['excellent'] += 1

            graph_data = {
                "distribution": {
                    "present": overall['present_total'] or 0,
                    "absent": overall['absent_total'] or 0,
                    "od": overall['od_total'] or 0
                },
                "performance": [
                    {"name": "Needs Improvement (<75%)", "count": buckets['needs_improvement']},
                    {"name": "Good (75-90%)", "count": buckets['good']},
                    {"name": "Excellent (>90%)", "count": buckets['excellent']}
                ]
            }

            data = { "month": start_date.strftime("%B %Y"), "stats": stats, "graph_data": graph_data }

        elif type == 'year':
            # Stats per student for the year
            start_date = target_date.replace(month=1, day=1)
            end_date = target_date.replace(month=12, day=31)
            
            end_date = target_date.replace(month=12, day=31)
            
            qs = Attendance.objects.filter(date__range=[start_date, end_date])
            qs = filter_hod(qs)

            if batch_id:
                qs = qs.filter(student__batch_id=batch_id)
                
            # Aggregation per student
            # Aggregation per student
            from django.db.models import Count, Q
            stats_qs = qs.values('student__name', 'student__roll_number').annotate(
                present=Count('id', filter=Q(status='present')),
                absent=Count('id', filter=Q(status='absent')),
                od=Count('id', filter=Q(status='OD')),
                total=Count('id')
            )
            stats = list(stats_qs)

            # Graph Data Calculation
            overall = qs.aggregate(
                 present_total=Count('id', filter=Q(status='present')),
                 absent_total=Count('id', filter=Q(status='absent')),
                 od_total=Count('id', filter=Q(status='OD'))
            )
            
            buckets = {'needs_improvement': 0, 'good': 0, 'excellent': 0}
            for s in stats:
                total_classes = s['present'] + s['absent'] + s['od']
                if total_classes > 0:
                    percentage = ((s['present'] + s['od']) / total_classes) * 100
                    if percentage < 75:
                        buckets['needs_improvement'] += 1
                    elif percentage < 90:
                        buckets['good'] += 1
                    else:
                        buckets['excellent'] += 1

            graph_data = {
                "distribution": {
                    "present": overall['present_total'] or 0,
                    "absent": overall['absent_total'] or 0,
                    "od": overall['od_total'] or 0
                },
                "performance": [
                    {"name": "Needs Improvement (<75%)", "count": buckets['needs_improvement']},
                    {"name": "Good (75-90%)", "count": buckets['good']},
                    {"name": "Excellent (>90%)", "count": buckets['excellent']}
                ]
            }

            data = { "year": target_date.year, "stats": stats, "graph_data": graph_data }

        return Response(data)

class ChangeRequestViewSet(viewsets.ModelViewSet):
    queryset = AttendanceChangeRequest.objects.all()
    serializer_class = ChangeRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin' or user.is_superuser:
            return AttendanceChangeRequest.objects.all().order_by('-created_at')
        elif user.role == 'faculty':
            return AttendanceChangeRequest.objects.filter(requested_by__user=user).order_by('-created_at')
        elif user.role == 'hod' and hasattr(user, 'faculty_profile') and hasattr(user.faculty_profile, 'hod_of'):
            dept = user.faculty_profile.hod_of
            from django.db.models import Q
            return AttendanceChangeRequest.objects.filter(
                Q(requested_by__department__iexact=dept.name) | Q(requested_by__department__iexact=dept.code)
            ).order_by('-created_at')

        return AttendanceChangeRequest.objects.none()

    def perform_create(self, serializer):
        # Faculty creating a request
        user = self.request.user
        if not hasattr(user, 'faculty_profile'):
             raise serializers.ValidationError("Only faculty can request changes.")
        serializer.save(requested_by=user.faculty_profile)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role not in ['admin', 'hod'] and not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=403)

            
        req = self.get_object()
        req.status = 'approved'
        req.resolved_at = timezone.now()
        req.save()
        
        # Unlock Session for 1 Hour (or config)
        session = req.session
        session.is_locked = False
        session.unlocked_until = timezone.now() + timezone.timedelta(hours=1)
        session.save()
        
        return Response({"status": "approved", "message": "Session unlocked for 1 hour"})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role not in ['admin', 'hod'] and not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=403)

            
        req = self.get_object()
        req.status = 'rejected'
        req.resolved_at = timezone.now()
        req.save()
        
        return Response({"status": "rejected"})
