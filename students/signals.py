from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import Student
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Student)
def track_student_changes(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_instance = Student.objects.get(pk=instance.pk)
        except Student.DoesNotExist:
            instance._old_instance = None
    else:
        instance._old_instance = None

import threading

class EmailThread(threading.Thread):
    def __init__(self, subject, message, recipient_list):
        self.subject = subject
        self.message = message
        self.recipient_list = recipient_list
        threading.Thread.__init__(self)

    def run(self):
        try:
            send_mail(
                self.subject,
                self.message,
                settings.DEFAULT_FROM_EMAIL,
                self.recipient_list,
                fail_silently=False,
            )
            # logger.info(f"Email sent to {self.recipient_list}")
        except Exception as e:
            logger.error(f"Failed to send email to {self.recipient_list}: {e}")

@receiver(post_save, sender=Student)
def send_student_notification(sender, instance, created, **kwargs):
    if not instance.email:
        return

    subject = ""
    message = ""

    if created:
        # Generate User credentials
        import secrets
        import string
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        import random
        
        # Generate Password
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        
        # Generate Username
        # Generate Username
        base_username = instance.name.lower().replace(" ", "")
        username = base_username
        
        # Ensure uniqueness
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        try:
            if not instance.user:
                # Create user
                user = User.objects.create_user(username=username, password=password, email=instance.email)
                
                instance.user = user
                instance.plain_password = password
                instance.save()
        
        except Exception as e:
            logger.error(f"Error creating user for student {instance.name}: {e}")
            password = "Failed to generate (contact admin)"
            username = "Failed"

        subject = 'Welcome to the Institute - Login Credentials'
        message = (
            f"Dear {instance.name},\n\n"
            f"We are delighted to welcome you to our institute.\n"
            f"Your student profile and login account have been successfully created.\n\n"
            f"Here are your details:\n"
            f"- Roll Number: {instance.roll_number}\n"
            f"- Batch: {instance.batch.name} ({instance.batch.year})\n\n"
            f"Login Credentials:\n"
            f"- Username: {username}\n"
            f"- Password: {password}\n\n"
            f"Please login to check your attendance percentage.\n\n"
            f"If you have any questions, please do not hesitate to contact the administration.\n\n"
            f"Best regards,\n"
            f"The Administration Team"
        )
    else:
        # Check for changes
        old_instance = getattr(instance, '_old_instance', None)
        changes = []
        
        if old_instance:
            if old_instance.name != instance.name:
                changes.append(f"- Name: '{old_instance.name}' -> '{instance.name}'")
            if old_instance.roll_number != instance.roll_number:
                changes.append(f"- Roll Number: '{old_instance.roll_number}' -> '{instance.roll_number}'")
            if old_instance.batch != instance.batch:
                changes.append(f"- Batch: '{old_instance.batch}' -> '{instance.batch}'")
        
        if not changes:
            return  # No significant changes to notify about

        subject = 'Notice of Profile Update'
        message = (
            f"Dear {instance.name},\n\n"
            f"This email is to inform you that your student profile details have been updated.\n\n"
            f"The following changes were made:\n"
            f"{chr(10).join(changes)}\n\n"
            f"If you did not authorize these changes, please contact the administration immediately.\n\n"
            f"Best regards,\n"
            f"The Administration Team"
        )

    # Send Email Asynchronously
    EmailThread(subject, message, [instance.email]).start()

@receiver(post_delete, sender=Student)
def send_delete_notification(sender, instance, **kwargs):
    if not instance.email:
        return

    subject = 'Profile Deletion Confirmation'
    message = (
        f"Dear {instance.name},\n\n"
        f"This email is to confirm that your student profile and all associated data have been permanently deleted from our records.\n\n"
        f"We wish you all the best in your future endeavors.\n\n"
        f"Best regards,\n"
        f"The Administration Team"
    )

    # Send Email Asynchronously
    EmailThread(subject, message, [instance.email]).start()
