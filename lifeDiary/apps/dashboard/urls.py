from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.index, name='index'),
    path('api/slot/<int:slot_index>/', views.get_slot_data, name='get_slot_data'),
] 