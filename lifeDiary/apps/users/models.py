from django.db import models
from django.contrib.auth.models import User
from apps.tags.models import Tag

# Create your models here.

class UserGoal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)
    period = models.CharField(max_length=10, choices=[('daily', '일간'), ('weekly', '주간'), ('monthly', '월간')])
    target_hours = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.tag.name} ({self.period}): {self.target_hours}시간"

class UserNote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.created_at.strftime('%Y-%m-%d')}"
