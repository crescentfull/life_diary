from django.urls import path
from . import views

app_name = 'stats_api'

urlpatterns = [
    path('stats/daily/', views.daily_stats, name='daily_stats'),
    path('stats/weekly/', views.weekly_stats, name='weekly_stats'),
    path('stats/monthly/', views.monthly_stats, name='monthly_stats'),
    path('stats/tag-analysis/', views.tag_analysis, name='tag_analysis'),
] 