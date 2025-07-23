from django.urls import path
from . import views

app_name = 'stats'

urlpatterns = [
    path('', views.index, name='index'),
    # 통계 API
    path('api/daily/', views.daily_stats, name='daily_stats'),
    path('api/weekly/', views.weekly_stats, name='weekly_stats'),
    path('api/monthly/', views.monthly_stats, name='monthly_stats'),
    path('api/tags/', views.tag_analysis, name='tag_analysis'),
] 