from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime, date, timedelta
import json

from apps.dashboard.models import TimeBlock
from apps.tags.models import Tag

# Create your views here.

@login_required
def index(request: HttpRequest) -> HttpResponse:
    """
    통계 메인 페이지
    """
    # 기본 날짜 설정
    selected_date_str = request.GET.get('date')
    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date() if selected_date_str else date.today()
    except ValueError:
        selected_date = date.today()
    
    # 기본 통계 데이터
    total_blocks = TimeBlock.objects.filter(user=request.user).count()
    total_days = TimeBlock.objects.filter(user=request.user).values('date').distinct().count()
    
    context = {
        'page_title': '통계',
        'selected_date': selected_date,
        'total_blocks': total_blocks,
        'total_days': total_days,
        'total_hours': round(total_blocks * 10 / 60, 1),
    }
    return render(request, 'stats/index.html', context)


class StatsAPIView:
    """
    통계 API를 위한 기본 클래스
    """
    
    @staticmethod
    def parse_date(date_str: str, default: date = None) -> date:
        """날짜 문자열을 파싱하여 date 객체로 변환"""
        if not date_str:
            return default or date.today()
        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return default or date.today()
    
    @staticmethod
    def get_user_blocks(user, **filters):
        """사용자의 TimeBlock 쿼리셋 반환"""
        return TimeBlock.objects.filter(user=user, **filters).select_related('tag')
    
    @staticmethod
    def success_response(data: dict) -> JsonResponse:
        """성공 응답 생성"""
        return JsonResponse({'success': True, **data})
    
    @staticmethod
    def error_response(message: str, status: int = 400) -> JsonResponse:
        """에러 응답 생성"""
        return JsonResponse({'success': False, 'error': message}, status=status)


@login_required
@require_http_methods(["GET"])
def daily_stats(request):
    """
    일별 통계 API
    GET /stats/api/daily/?date=YYYY-MM-DD
    """
    api = StatsAPIView()
    selected_date = api.parse_date(request.GET.get('date'))
    
    # 해당 날짜의 시간 블록들
    time_blocks = api.get_user_blocks(request.user, date=selected_date)
    
    # 태그별 시간 집계
    tag_stats = {}
    hourly_stats = [0] * 24  # 24시간별 통계
    
    for block in time_blocks:
        # 태그별 집계
        tag_name = block.tag.name
        tag_color = block.tag.color
        
        if tag_name not in tag_stats:
            tag_stats[tag_name] = {
                'name': tag_name,
                'color': tag_color,
                'minutes': 0,
                'blocks': 0
            }
        
        tag_stats[tag_name]['minutes'] += 10
        tag_stats[tag_name]['blocks'] += 1
        
        # 시간대별 집계
        hour = block.slot_index // 6
        hourly_stats[hour] += 1
    
    # 태그별 데이터를 분 단위에서 시간 단위로 변환
    for tag_data in tag_stats.values():
        tag_data['hours'] = round(tag_data['minutes'] / 60, 1)
    
    return api.success_response({
        'date': selected_date.strftime('%Y-%m-%d'),
        'tag_stats': list(tag_stats.values()),
        'hourly_stats': hourly_stats,
        'total_blocks': len(time_blocks),
        'total_hours': round(len(time_blocks) * 10 / 60, 1),
        'fill_percentage': round((len(time_blocks) / 144) * 100, 1)
    })


@login_required
@require_http_methods(["GET"])
def weekly_stats(request):
    """
    주간 통계 API
    GET /stats/api/weekly/?date=YYYY-MM-DD
    """
    api = StatsAPIView()
    selected_date = api.parse_date(request.GET.get('date'))
    
    # 주간 시작일 (월요일)
    start_of_week = selected_date - timedelta(days=selected_date.weekday())
    week_dates = [start_of_week + timedelta(days=i) for i in range(7)]
    
    # 주간 데이터
    weekly_data = []
    tag_weekly_stats = {}
    
    for date_item in week_dates:
        # 해당 날짜의 블록들
        daily_blocks = api.get_user_blocks(request.user, date=date_item)
        
        daily_tag_stats = {}
        for block in daily_blocks:
            tag_name = block.tag.name
            if tag_name not in daily_tag_stats:
                daily_tag_stats[tag_name] = 0
            daily_tag_stats[tag_name] += 10  # 10분씩 증가
            
            # 주간 태그 통계
            if tag_name not in tag_weekly_stats:
                tag_weekly_stats[tag_name] = {
                    'name': tag_name,
                    'color': block.tag.color,
                    'daily_minutes': [0] * 7
                }
            
            day_index = (date_item - start_of_week).days
            tag_weekly_stats[tag_name]['daily_minutes'][day_index] += 10
        
        weekly_data.append({
            'date': date_item.strftime('%Y-%m-%d'),
            'day_name': date_item.strftime('%a'),
            'day_korean': ['월', '화', '수', '목', '금', '토', '일'][date_item.weekday()],
            'total_blocks': len(daily_blocks),
            'total_minutes': len(daily_blocks) * 10,
            'fill_percentage': round((len(daily_blocks) / 144) * 100, 1),
            'tag_stats': daily_tag_stats
        })
    
    # 주간 태그 통계를 시간 단위로 변환
    for tag_data in tag_weekly_stats.values():
        tag_data['total_hours'] = round(sum(tag_data['daily_minutes']) / 60, 1)
        tag_data['daily_hours'] = [round(m / 60, 1) for m in tag_data['daily_minutes']]
    
    return api.success_response({
        'start_date': start_of_week.strftime('%Y-%m-%d'),
        'end_date': week_dates[-1].strftime('%Y-%m-%d'),
        'weekly_data': weekly_data,
        'tag_weekly_stats': list(tag_weekly_stats.values()),
        'week_total_hours': round(sum(day['total_minutes'] for day in weekly_data) / 60, 1)
    })


@login_required
@require_http_methods(["GET"])
def monthly_stats(request):
    """
    월간 통계 API
    GET /stats/api/monthly/?date=YYYY-MM-DD
    """
    api = StatsAPIView()
    selected_date = api.parse_date(request.GET.get('date'))
    
    # 월의 시작일과 종료일
    start_of_month = selected_date.replace(day=1)
    if start_of_month.month == 12:
        end_of_month = start_of_month.replace(year=start_of_month.year + 1, month=1) - timedelta(days=1)
    else:
        end_of_month = start_of_month.replace(month=start_of_month.month + 1) - timedelta(days=1)
    
    # 월간 데이터
    monthly_blocks = api.get_user_blocks(
        request.user, 
        date__range=[start_of_month, end_of_month]
    )
    
    # 일별 통계
    daily_stats = {}
    tag_monthly_stats = {}
    
    for block in monthly_blocks:
        date_str = block.date.strftime('%Y-%m-%d')
        
        # 일별 통계
        if date_str not in daily_stats:
            daily_stats[date_str] = {
                'date': date_str,
                'blocks': 0,
                'minutes': 0,
                'tags': set()
            }
        
        daily_stats[date_str]['blocks'] += 1
        daily_stats[date_str]['minutes'] += 10
        daily_stats[date_str]['tags'].add(block.tag.name)
        
        # 태그별 월간 통계
        tag_name = block.tag.name
        if tag_name not in tag_monthly_stats:
            tag_monthly_stats[tag_name] = {
                'name': tag_name,
                'color': block.tag.color,
                'total_minutes': 0,
                'days_used': set()
            }
        
        tag_monthly_stats[tag_name]['total_minutes'] += 10
        tag_monthly_stats[tag_name]['days_used'].add(date_str)
    
    # 일별 통계 정리
    daily_list = []
    for date_str, stats in daily_stats.items():
        stats['hours'] = round(stats['minutes'] / 60, 1)
        stats['fill_percentage'] = round((stats['blocks'] / 144) * 100, 1)
        stats['tag_diversity'] = len(stats['tags'])
        del stats['tags']  # set은 JSON 직렬화 불가
        daily_list.append(stats)
    
    daily_list.sort(key=lambda x: x['date'])
    
    # 태그별 통계 정리
    tag_list = []
    for tag_name, stats in tag_monthly_stats.items():
        stats['total_hours'] = round(stats['total_minutes'] / 60, 1)
        stats['days_used'] = len(stats['days_used'])
        tag_list.append(stats)
    
    tag_list.sort(key=lambda x: x['total_hours'], reverse=True)
    
    return api.success_response({
        'month': selected_date.strftime('%Y-%m'),
        'start_date': start_of_month.strftime('%Y-%m-%d'),
        'end_date': end_of_month.strftime('%Y-%m-%d'),
        'daily_stats': daily_list,
        'tag_stats': tag_list,
        'total_blocks': len(monthly_blocks),
        'total_hours': round(len(monthly_blocks) * 10 / 60, 1),
        'active_days': len(daily_stats),
        'total_days': (end_of_month - start_of_month).days + 1
    })


@login_required
@require_http_methods(["GET"])
def tag_analysis(request):
    """
    태그별 종합 분석 API
    GET /stats/api/tags/
    """
    api = StatsAPIView()
    
    # 전체 기간 태그 사용 통계
    all_blocks = api.get_user_blocks(request.user)
    
    tag_analysis_data = {}
    date_range = set()
    
    for block in all_blocks:
        tag_name = block.tag.name
        date_range.add(block.date)
        
        if tag_name not in tag_analysis_data:
            tag_analysis_data[tag_name] = {
                'name': tag_name,
                'color': block.tag.color,
                'total_minutes': 0,
                'total_blocks': 0,
                'days_used': set(),
                'first_used': block.date,
                'last_used': block.date
            }
        
        data = tag_analysis_data[tag_name]
        data['total_minutes'] += 10
        data['total_blocks'] += 1
        data['days_used'].add(block.date)
        
        if block.date < data['first_used']:
            data['first_used'] = block.date
        if block.date > data['last_used']:
            data['last_used'] = block.date
    
    # 분석 데이터 정리
    analysis_list = []
    total_days = len(date_range) if date_range else 1
    
    for tag_name, data in tag_analysis_data.items():
        analysis_list.append({
            'name': data['name'],
            'color': data['color'],
            'total_hours': round(data['total_minutes'] / 60, 1),
            'total_blocks': data['total_blocks'],
            'days_used': len(data['days_used']),
            'usage_frequency': round(len(data['days_used']) / total_days * 100, 1),
            'avg_daily_minutes': round(data['total_minutes'] / len(data['days_used']), 1) if data['days_used'] else 0,
            'first_used': data['first_used'].strftime('%Y-%m-%d'),
            'last_used': data['last_used'].strftime('%Y-%m-%d')
        })
    
    analysis_list.sort(key=lambda x: x['total_hours'], reverse=True)
    
    return api.success_response({
        'tag_analysis': analysis_list,
        'total_tags': len(analysis_list),
        'total_blocks': len(all_blocks),
        'total_hours': round(len(all_blocks) * 10 / 60, 1),
        'active_days': total_days,
        'date_range': {
            'start': min(date_range).strftime('%Y-%m-%d') if date_range else None,
            'end': max(date_range).strftime('%Y-%m-%d') if date_range else None
        }
    })
