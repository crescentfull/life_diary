from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse

# Create your views here.

@login_required
def index(request: HttpRequest) -> HttpResponse:
    """
    태그 관리 페이지 (임시)
    """
    context = {
        'page_title': '태그 관리',
        'development_stage': 'Day 3에 구현 예정'
    }
    return render(request, 'tags/index.html', context)
