from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse

# Create your views here.

@login_required
def index(request: HttpRequest) -> HttpResponse:
    """
    통계 페이지 (임시)
    """
    context = {
        'page_title': '통계',
        'development_stage': 'Day 3에 구현 예정'
    }
    return render(request, 'stats/index.html', context)
