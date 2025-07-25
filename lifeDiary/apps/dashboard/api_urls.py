from django.urls import path
from . import views

app_name = 'dashboard_api'

urlpatterns = [
    # 시간 블록 관리 API
    path('time-blocks/', views.time_block_api, name='time_block_api'),
    
    # 향후 확장 가능한 RESTful API 엔드포인트들
    # path('time-blocks/<int:block_id>/', views.time_block_detail_api, name='time_block_detail'),
    # path('daily-summary/<str:date>/', views.daily_summary_api, name='daily_summary'),
] 