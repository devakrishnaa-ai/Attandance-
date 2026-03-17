from rest_framework import serializers
from django.contrib.auth import get_user_model
from students.models import Student, Batch
from attendance.models import Attendance, AttendanceSession, AttendanceChangeRequest
from faculty.models import Faculty, Subject, FacultyAssignment, Department

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role')
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password'],
            role=validated_data.get('role', 'student')
        )
        return user

class BatchSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = '__all__'

    def get_display_name(self, obj):
        return str(obj)

class StudentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    
    class Meta:
        model = Student
        fields = '__all__'

    def validate_email(self, value):
        if value and not value.endswith('@gmail.com'):
            raise serializers.ValidationError("Only @gmail.com addresses are allowed.")
        return value

    def validate_name(self, value):
        import re
        if not re.match(r'^[a-zA-Z\s]+$', value):
            raise serializers.ValidationError("Name must contain only alphabets and spaces.")
        return value

    def validate_roll_number(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("Roll number must contain only digits.")
        return value

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.name')
    student_roll = serializers.ReadOnlyField(source='student.roll_number')

    class Meta:
        model = Attendance
        fields = '__all__'

# --- Faculty & New Attendance Serializers ---

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'

class FacultySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    
    class Meta:
        model = Faculty
        fields = ['id', 'username', 'email', 'full_name', 'department', 'phone_number', 'plain_password', 'is_active', 'role']

    def get_full_name(self, obj):
        return obj.user.get_full_name()

class DepartmentSerializer(serializers.ModelSerializer):
    head_of_department_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'head_of_department', 'head_of_department_name']
    
    def get_head_of_department_name(self, obj):
        if obj.head_of_department:
            return obj.head_of_department.user.get_full_name()
        return None

class FacultyAssignmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    batch_name = serializers.SerializerMethodField()
    
    class Meta:
        model = FacultyAssignment
        fields = '__all__'
    
    def get_batch_name(self, obj):
        return str(obj.batch)

class AttendanceSessionSerializer(serializers.ModelSerializer):
    is_editable = serializers.ReadOnlyField()
    batch_name = serializers.SerializerMethodField()
    subject_name = serializers.ReadOnlyField(source='subject.name')
    faculty_name = serializers.ReadOnlyField(source='faculty.user.get_full_name')

    class Meta:
        model = AttendanceSession
        fields = '__all__'
    
    def get_batch_name(self, obj):
        return str(obj.batch)

class ChangeRequestSerializer(serializers.ModelSerializer):
    session_details = AttendanceSessionSerializer(source='session', read_only=True)
    faculty_name = serializers.ReadOnlyField(source='requested_by.user.get_full_name')
    
    class Meta:
        model = AttendanceChangeRequest
        fields = '__all__'
        extra_kwargs = {
            'requested_by': {'read_only': True}
        }
