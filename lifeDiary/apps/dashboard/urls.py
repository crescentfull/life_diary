from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    # 메인 대시보드
    path('', views.index, name='index'),
    
    # RESTful API - Time Blocks
    path('api/blocks/', views.time_blocks_handler, name='time_blocks'),  # GET, POST, DELETE
    path('api/blocks/<int:slot_index>/', views.get_slot_data, name='slot_detail'),  # GET: 개별 조회
] 