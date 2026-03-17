import os
import django
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

User = get_user_model()
try:
    user = User.objects.get(username='admin')
    user.set_password('password123')
    user.save()
    print("Admin password reset.")
except User.DoesNotExist:
    User.objects.create_superuser('admin', 'admin@example.com', 'password123')
    print("Superuser created.")
