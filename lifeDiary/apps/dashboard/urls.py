from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.index, name='index'),
    path('api/slot/<int:slot_index>/', views.get_slot_data, name='get_slot_data'),
    path('api/save-blocks/', views.save_time_blocks, name='save_time_blocks'),
    path('api/delete-blocks/', views.delete_time_blocks, name='delete_time_blocks'),
] 