from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Student, Batch
from attendance.models import Attendance
from faculty.models import Department
from backend.serializers import StudentSerializer, BatchSerializer
from rest_framework.permissions import IsAuthenticated
from backend.permissions import IsAdminRole, IsAdminOrHOD

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        # Faculty Restriction
        if user.role == 'faculty' and hasattr(user, 'faculty_profile'):
            faculty = user.faculty_profile
            # Only students in batches assigned to this faculty
            # Logic: FacultyAssignment maps Faculty -> Batch
            assigned_batch_ids = faculty.assignments.values_list('batch_id', flat=True)
            queryset = queryset.filter(batch_id__in=assigned_batch_ids)

        # HOD Restriction
        if user.role == 'hod' and hasattr(user, 'faculty_profile'):
            faculty = user.faculty_profile
            # Check if this faculty is an HOD
            if hasattr(faculty, 'hod_of'): # hod_of related name in Department model
                department_code = faculty.hod_of.code
                # Filter batches by this department code
                queryset = queryset.filter(batch__department__iexact=department_code)

        
        # Filter by batch if param provided (common use case)
        batch_id = self.request.query_params.get('batch')
        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)

        return queryset

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        student = self.get_object()
        if not student.user:
            return Response(
                {"error": "Student does not have a linked user account"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Toggle activation
        student.user.is_active = not student.user.is_active
        student.user.save()
        
        status_msg = "activated" if student.user.is_active else "deactivated"
        return Response({
            "status": status_msg,
            "is_active": student.user.is_active
        })

class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.role == 'faculty' and hasattr(user, 'faculty_profile'):
            faculty = user.faculty_profile
            assigned_batch_ids = faculty.assignments.values_list('batch_id', flat=True)
            queryset = queryset.filter(id__in=assigned_batch_ids) # Only return assigned batches

        if user.role == 'hod' and hasattr(user, 'faculty_profile'):
             faculty = user.faculty_profile
             if hasattr(faculty, 'hod_of'):
                department_code = faculty.hod_of.code
                queryset = queryset.filter(department__iexact=department_code)

            
        # Optional: Filter by department code 
        dept_code = self.request.query_params.get('department')
        if dept_code:
            queryset = queryset.filter(department=dept_code)

        return queryset

class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
             return Response({"error": "No student profile associated with this account"}, status=404)
        except AttributeError:
             return Response({"error": "Not a student account"}, status=400)

        # Calculate Stats
        attendance_records = Attendance.objects.filter(student=student)
        total_days = attendance_records.count()
        present_days = attendance_records.filter(status='present').count()
        absent_days = attendance_records.filter(status='absent').count()
        od_days = attendance_records.filter(status='OD').count()
        
        # OD is usually considered present for percentage, depends on logic. 
        # User said "attendance percentage view". Assuming (Present + OD) / Total
        # or just Present. Let's do (Present + OD) effectively.
        effective_present = present_days + od_days
        percentage = (effective_present / total_days * 100) if total_days > 0 else 0
        

        # Recent Absent Records
        absent_records = attendance_records.filter(status='absent').select_related('session', 'session__subject').order_by('-date')[:10]
        absent_data = []
        for r in absent_records:
            subject_name = r.session.subject.name if r.session and r.session.subject else "Unassigned Subject"
            absent_data.append({
                "date": r.date,
                "period": r.period,
                "subject": subject_name,
                "status": r.status
            })

        # Calculate Subject-wise Stats
        from django.db.models import Count, Q
        subject_stats = []
        
        # Group by Subject and Aggregate
        # We filter where session__subject is not null
        subj_agg = attendance_records.exclude(session__subject__isnull=True).values(
            'session__subject__name', 'session__subject__code'
        ).annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present') | Q(status='OD')),
            absent=Count('id', filter=Q(status='absent'))
        ).order_by('session__subject__name')
        
        for s in subj_agg:
            total = s['total']
            present = s['present']
            pct = (present / total * 100) if total > 0 else 0
            subject_stats.append({
                "subject": s['session__subject__name'],
                "code": s.get('session__subject__code', ''),
                "total": total,
                "present": present,
                "absent": s['absent'],
                "percentage": round(pct, 1)
            })

        # Get Department Info
        dept_code = student.batch.department
        dept_name = dept_code
        try:
             dept_obj = Department.objects.filter(code=dept_code).first()
             if dept_obj:
                 dept_name = dept_obj.name
        except:
             pass

        return Response({
            "name": student.name,
            "roll_number": student.roll_number,
            "department": {"name": dept_name, "code": dept_code},
            "batch": str(student.batch),
            "profile_photo": request.build_absolute_uri(student.profile_photo.url) if student.profile_photo else None,
            "stats": {
                "total_days": total_days,
                "present_days": present_days,
                "absent_days": absent_days,
                "od_days": od_days,
                "percentage": round(percentage, 2)
            },
            "subject_stats": subject_stats,
            "absent_history": absent_data
        })
