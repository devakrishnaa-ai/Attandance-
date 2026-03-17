from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from backend.permissions import IsAdminRole, IsAdminOrHOD
from django.db.models import Q
from .models import Faculty, Subject, FacultyAssignment, Department
from backend.serializers import FacultySerializer, SubjectSerializer, FacultyAssignmentSerializer, DepartmentSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class FacultyViewSet(viewsets.ModelViewSet):
    queryset = Faculty.objects.all()
    serializer_class = FacultySerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Faculty.objects.all()
        if user.role == 'hod' and hasattr(user, 'faculty_profile'):
             hod_profile = user.faculty_profile
             if hasattr(hod_profile, 'hod_of'):
                 dept = hod_profile.hod_of
                 queryset = queryset.filter(Q(department__iexact=dept.name) | Q(department__iexact=dept.code))
        return queryset

    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        faculty = self.get_object()
        faculty.user.is_active = not faculty.user.is_active
        faculty.user.save()
        status_msg = "activated" if faculty.user.is_active else "deactivated"
        return Response({'status': status_msg, 'is_active': faculty.user.is_active})

    def create(self, request, *args, **kwargs):
        # Custom create to handle User creation + Faculty profile
        data = request.data
        try:
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                role=data.get('role', 'faculty')
            )
            faculty = Faculty.objects.create(
                user=user,
                department=data.get('department', ''),
                phone_number=data.get('phone_number', ''),
                plain_password=data['password']
            )

            # Handle HOD assignment
            if data.get('role') == 'hod':
                dept_code = data.get('department')
                if dept_code:
                    try:
                        dept = Department.objects.get(code=dept_code)
                        dept.head_of_department = faculty
                        dept.save()
                    except Department.DoesNotExist:
                        pass

            return Response(FacultySerializer(faculty).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        faculty = self.get_object()
        data = request.data
        
        try:
            # Update User fields
            user = faculty.user
            user.first_name = data.get('first_name', user.first_name)
            user.last_name = data.get('last_name', user.last_name)
            user.email = data.get('email', user.email)
            if 'username' in data and data['username'] != user.username:
                 user.username = data['username']
            user.save()

            # Update Faculty fields
            faculty.department = data.get('department', faculty.department)
            faculty.phone_number = data.get('phone_number', faculty.phone_number)
            faculty.save()

            # Handle Role Update (e.g. promoting to HOD or demoting)
            new_role = data.get('role')
            if new_role:
                 user.role = new_role
                 user.save()
                 
                 if new_role == 'hod':
                      dept_code = faculty.department
                      if dept_code:
                           Department.objects.filter(code=dept_code).update(head_of_department=faculty)
                 elif new_role == 'faculty':
                      # If demoted, check if they were HOD and remove them
                      Department.objects.filter(head_of_department=faculty).update(head_of_department=None)

            
            return Response(FacultySerializer(faculty).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_destroy(self, instance):
        # Delete the user as well to clean up
        user = instance.user
        instance.delete()
        if user:
            user.delete()
            
class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Department.objects.all()
        if user.role == 'hod' and hasattr(user, 'faculty_profile'):
             hod_profile = user.faculty_profile
             if hasattr(hod_profile, 'hod_of'):
                 queryset = queryset.filter(id=hod_profile.hod_of.id)
        return queryset

    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Subject.objects.all()
        if user.role == 'hod' and hasattr(user, 'faculty_profile'):
             hod_profile = user.faculty_profile
             if hasattr(hod_profile, 'hod_of'):
                 queryset = queryset.filter(department=hod_profile.hod_of.code)
        return queryset

    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = FacultyAssignment.objects.all()
    serializer_class = FacultyAssignmentSerializer
    
    def get_permissions(self):
        # Admin can do everything. Faculty can only list their own assignments.
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'faculty':
            return FacultyAssignment.objects.filter(faculty__user=user)
        
        if user.role == 'hod' and hasattr(user, 'faculty_profile'):
             hod_profile = user.faculty_profile
             if hasattr(hod_profile, 'hod_of'):
                 dept_code = hod_profile.hod_of.code
                 # Filter by subject department or batch department
                 return FacultyAssignment.objects.filter(subject__department=dept_code)

        return FacultyAssignment.objects.all()
