from django.urls import path
from . import views

app_name = 'tags'

urlpatterns = [
    path('', views.index, name='index'),
    # 태그 관리 API
    path('api/', views.get_tags, name='get_tags'),
    path('api/create/', views.create_tag, name='create_tag'),
    path('api/<int:tag_id>/update/', views.update_tag, name='update_tag'),
    path('api/<int:tag_id>/delete/', views.delete_tag, name='delete_tag'),
    # 디버그 API
    path('api/debug/', views.debug_tags, name='debug_tags'),
] 