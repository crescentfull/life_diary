from django.urls import path
from . import views

app_name = 'tags'

urlpatterns = [
    # 메인 페이지
    path('', views.index, name='index'),
    
    # RESTful API 라우팅
    path('api/tags/', views.tags_handler, name='tags'),  # GET: 목록, POST: 생성
    path('api/tags/<int:tag_id>/', views.tag_detail_handler, name='tag_detail'),  # GET: 상세, PUT: 수정, DELETE: 삭제
    
    # 레거시 호환성을 위한 URL (단계적 제거 예정)
    path('api/', views.get_tags, name='get_tags'),  # 기존 클라이언트 호환성
    path('api/create/', views.create_tag, name='create_tag'),
    path('api/<int:tag_id>/update/', views.update_tag, name='update_tag'),
    path('api/<int:tag_id>/delete/', views.delete_tag, name='delete_tag'),
] 