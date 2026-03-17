from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


from accounts.views import UserViewSet, CustomTokenObtainPairView
from students.views import StudentViewSet, BatchViewSet, StudentDashboardView
from faculty.views import FacultyViewSet, SubjectViewSet, AssignmentViewSet, DepartmentViewSet
from attendance.views import AttendanceViewSet, ChangeRequestViewSet
from timetable.views import TimetableViewSet


def home(request):
    return JsonResponse({"message": "Backend is running successfully"})


router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'students', StudentViewSet)
router.register(r'batches', BatchViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'faculty', FacultyViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'assignments', AssignmentViewSet)
router.register(r'change-requests', ChangeRequestViewSet)
router.register(r'timetable', TimetableViewSet, basename='timetable')

urlpatterns = [
    path('', home),  # ✅ THIS FIXES THE 404
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/student/dashboard/', StudentDashboardView.as_view(), name='student_dashboard'),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
