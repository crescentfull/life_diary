from django import forms
from .models import UserGoal, UserNote

class UserGoalForm(forms.ModelForm):
    class Meta:
        model = UserGoal
        fields = ['tag', 'period', 'target_hours']
        widgets = {
            'period': forms.Select(choices=[('daily', '일간'), ('weekly', '주간'), ('monthly', '월간')]),
            'target_hours': forms.NumberInput(attrs={'step': 0.5, 'min': 0}),
        }

class UserNoteForm(forms.ModelForm):
    class Meta:
        model = UserNote
        fields = ['note']
        widgets = {
            'note': forms.Textarea(attrs={'rows': 4, 'placeholder': '특이사항을 입력하세요.'}),
        } 