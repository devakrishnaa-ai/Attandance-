from rest_framework import permissions

class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        print(f"DEBUG PERMISSION: User={request.user}, IsAuth={request.user.is_authenticated}, Role={getattr(request.user, 'role', 'NO_ROLE')}, Staff={request.user.is_staff}")
        return bool(request.user and request.user.is_authenticated and (getattr(request.user, 'role', '') == 'admin' or request.user.is_staff or request.user.is_superuser))


class IsFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', '') == 'faculty')

class IsHOD(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', '') == 'hod')

class IsAdminOrHOD(permissions.BasePermission):
    def has_permission(self, request, view):
         return bool(request.user and request.user.is_authenticated and (getattr(request.user, 'role', '') in ['admin', 'hod'] or request.user.is_superuser))
