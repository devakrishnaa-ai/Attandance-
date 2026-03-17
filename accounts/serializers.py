from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['role'] = getattr(user, 'role', 'student')
        
        # Add Name Claim
        name = user.get_full_name() or user.username
        if user.role == 'student' and hasattr(user, 'student_profile'):
             name = user.student_profile.name
        
        token['name'] = name

        return token

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        # Explicitly check if user exists
        if username and not User.objects.filter(username=username).exists():
            raise AuthenticationFailed({"detail": "Username not found. Please check your username or register."})
            
        # Pre-check password for granular error
        user = User.objects.filter(username=username).first()
        if user and not user.check_password(password):
             raise AuthenticationFailed({"detail": "Incorrect password. Please try again."})
        
        if user and not user.is_active:
             raise AuthenticationFailed({"detail": "Account is disabled."})

        data = super().validate(attrs)
        
        # Keep response data too, just in case
        data['username'] = self.user.username
        data['is_staff'] = self.user.is_staff
        data['is_superuser'] = self.user.is_superuser
        data['role'] = getattr(self.user, 'role', 'student')
        
        # Add name to response
        name = self.user.get_full_name() or self.user.username
        if getattr(self.user, 'role', '') == 'student' and hasattr(self.user, 'student_profile'):
             name = self.user.student_profile.name
        
        data['name'] = name
        
        return data
