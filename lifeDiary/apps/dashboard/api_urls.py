from django.urls import path
from . import views

app_name = 'dashboard_api'

urlpatterns = [
    path('time-blocks/', views.time_block_api, name='time_block_api'),
] 