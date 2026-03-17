import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print(f"{'Username':<15} | {'Role':<10} | {'Is Staff':<10} | {'Is Super':<10} | {'Is Active':<10}")
print("-" * 65)
for u in User.objects.all():
    print(f"{u.username:<15} | {getattr(u, 'role', 'N/A'):<10} | {str(u.is_staff):<10} | {str(u.is_superuser):<10} | {str(u.is_active):<10}")
