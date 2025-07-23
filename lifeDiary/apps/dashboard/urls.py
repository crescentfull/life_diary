from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.index, name='index'),
    path('api/slot/<int:slot_index>/', views.get_slot_data, name='get_slot_data'),
    path('api/save-blocks/', views.save_time_blocks, name='save_time_blocks'),
    path('api/delete-blocks/', views.delete_time_blocks, name='delete_time_blocks'),
    # 태그 관리 API
    path('api/tags/', views.get_tags, name='get_tags'),
    path('api/tags/create/', views.create_tag, name='create_tag'),
    path('api/tags/<int:tag_id>/update/', views.update_tag, name='update_tag'),
    path('api/tags/<int:tag_id>/delete/', views.delete_tag, name='delete_tag'),
    # 디버그 API
    path('api/debug/tags/', views.debug_tags, name='debug_tags'),
] 