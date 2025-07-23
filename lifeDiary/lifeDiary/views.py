from django.shortcuts import render
from django.http import HttpRequest, HttpResponse

def index(request: HttpRequest) -> HttpResponse:
    """
    메인 홈페이지
    """
    context = {
        'project_name': '10분 단위 라이프 다이어리',
        'project_description': '하루 24시간을 10분 단위로 직관적으로 기록하고 시각화하는 서비스입니다.',
        'features': [
            {
                'icon': 'fas fa-th',
                'title': 'TimeGrid 입력',
                'description': '클릭·드래그·터치로 복수 슬롯 선택하여 태그 저장'
            },
            {
                'icon': 'fas fa-tags',
                'title': '태그 관리',
                'description': '태그(이름·색상) CRUD 기능'
            },
            {
                'icon': 'fas fa-chart-bar',
                'title': '실시간 통계',
                'description': '일·주·월 단위 히트맵과 태그별 파이차트'
            }
        ]
    }
    return render(request, 'index.html', context) 