from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime, date, timedelta
import json

from apps.dashboard.models import TimeBlock
from apps.tags.models import Tag
from apps.core.utils import (
    safe_date_parse,
    serialize_for_js,
    calculate_time_statistics,
    get_week_date_range,
    get_month_date_range,
    UNCLASSIFIED_TAG_NAME,
    UNCLASSIFIED_TAG_COLOR,
    SLEEP_TAG_NAME,
    TOTAL_SLOTS_PER_DAY,
    SLOTS_PER_HOUR,
    MINUTES_PER_SLOT
)

# Create your views here.

class StatsCalculator:
    """통계 계산을 위한 공통 클래스"""
    
    def __init__(self, user, selected_date):
        self.user = user
        self.selected_date = selected_date
        self.start_of_month, self.end_of_month = get_month_date_range(selected_date)
        self.start_of_week, self.end_of_week = get_week_date_range(selected_date)
    
    def get_tag_info(self, block):
        """블록에서 태그 정보 추출"""
        if block.tag and block.tag.name:
            return {
                'name': block.tag.name,
                'color': block.tag.color or '#808080'
            }
        return None
    
    def process_blocks_without_tag(self, blocks, process_func):
        """태그가 없는 블록을 제외하고 처리"""
        for block in blocks:
            tag_info = self.get_tag_info(block)
            if tag_info:
                process_func(block, tag_info)
    
    def calculate_empty_slots(self, recorded_blocks_count):
        """빈 슬롯 계산"""
        empty_blocks = TOTAL_SLOTS_PER_DAY - recorded_blocks_count
        return empty_blocks * MINUTES_PER_SLOT
    
    def add_unclassified_data(self, data_container, empty_minutes, day_index=None, data_type='daily'):
        """미분류 데이터 추가"""
        if empty_minutes <= 0:
            return
            
        if data_type == 'daily':
            # 일별 통계용
            if UNCLASSIFIED_TAG_NAME not in data_container:
                data_container[UNCLASSIFIED_TAG_NAME] = {
                    'name': UNCLASSIFIED_TAG_NAME,
                    'color': UNCLASSIFIED_TAG_COLOR,
                    'minutes': 0,
                    'blocks': 0
                }
            data_container[UNCLASSIFIED_TAG_NAME]['minutes'] += empty_minutes
            data_container[UNCLASSIFIED_TAG_NAME]['blocks'] += empty_minutes // MINUTES_PER_SLOT
            
        elif data_type == 'weekly':
            # 주간 통계용
            if UNCLASSIFIED_TAG_NAME not in data_container:
                data_container[UNCLASSIFIED_TAG_NAME] = {
                    'name': UNCLASSIFIED_TAG_NAME,
                    'color': UNCLASSIFIED_TAG_COLOR,
                    'daily_minutes': [0] * 7
                }
            data_container[UNCLASSIFIED_TAG_NAME]['daily_minutes'][day_index] += empty_minutes
            
        elif data_type == 'monthly':
            # 월간 통계용 (별도 처리됨)
            pass
                
        elif data_type == 'analysis':
            # 태그 분석용
            if UNCLASSIFIED_TAG_NAME not in data_container:
                data_container[UNCLASSIFIED_TAG_NAME] = {
                    'name': UNCLASSIFIED_TAG_NAME,
                    'color': UNCLASSIFIED_TAG_COLOR,
                    'total_minutes': 0,
                    'total_blocks': 0,
                }
            data_container[UNCLASSIFIED_TAG_NAME]['total_minutes'] += empty_minutes
            data_container[UNCLASSIFIED_TAG_NAME]['total_blocks'] += empty_minutes // MINUTES_PER_SLOT
    
    def add_unclassified_to_hourly_stats(self, hourly_stats, hour, empty_minutes):
        """시간별 통계에 미분류 데이터 추가"""
        if empty_minutes > 0:
            hourly_stats[hour][UNCLASSIFIED_TAG_NAME] = hourly_stats[hour].get(UNCLASSIFIED_TAG_NAME, 0) + empty_minutes
    
    def fill_empty_slots_daily(self, time_blocks, tag_stats, hourly_stats):
        """일별 통계에서 빈 슬롯을 미분류로 채우기"""
        for hour in range(24):
            total_minutes_in_hour = sum(hourly_stats[hour].values())
            empty_minutes = 60 - total_minutes_in_hour
            
            if empty_minutes > 0:
                self.add_unclassified_data(tag_stats, empty_minutes, data_type='daily')
                self.add_unclassified_to_hourly_stats(hourly_stats, hour, empty_minutes)
    
    def fill_empty_slots_weekly(self, daily_blocks, daily_tag_stats, tag_weekly_stats, date_item):
        """주간 통계에서 빈 슬롯을 미분류로 채우기"""
        recorded_blocks = len(daily_blocks)
        empty_blocks = TOTAL_SLOTS_PER_DAY - recorded_blocks
        empty_minutes = empty_blocks * MINUTES_PER_SLOT
        
        if empty_minutes > 0:
            self.add_unclassified_data(daily_tag_stats, empty_minutes, data_type='daily')
            day_index = (date_item - self.start_of_week).days
            self.add_unclassified_data(tag_weekly_stats, empty_minutes, day_index, data_type='weekly')
    
    def fill_empty_slots_monthly(self, user, daily_tag_stats, daily_totals, total_days):
        """월간 통계에서 빈 슬롯을 미분류로 채우기"""
        for day_index in range(total_days):
            current_date = self.start_of_month + timedelta(days=day_index)
            recorded_blocks = TimeBlock.objects.filter(
                user=user,
                date=current_date
            ).count()
            
            empty_blocks = TOTAL_SLOTS_PER_DAY - recorded_blocks
            if empty_blocks > 0:
                empty_hours = empty_blocks * MINUTES_PER_SLOT / 60
                
                # 미분류 태그 초기화
                if UNCLASSIFIED_TAG_NAME not in daily_tag_stats:
                    daily_tag_stats[UNCLASSIFIED_TAG_NAME] = {
                        'name': UNCLASSIFIED_TAG_NAME,
                        'color': UNCLASSIFIED_TAG_COLOR,
                        'daily_hours': [0] * total_days,
                        'total_hours': 0
                    }
                
                daily_tag_stats[UNCLASSIFIED_TAG_NAME]['daily_hours'][day_index] += empty_hours
                daily_tag_stats[UNCLASSIFIED_TAG_NAME]['total_hours'] += empty_hours
                daily_totals[day_index] += empty_hours
    
    def fill_empty_slots_analysis(self, user, tag_analysis_data):
        """태그 분석에서 빈 슬롯을 미분류로 채우기"""
        total_days = (self.end_of_month - self.start_of_month).days + 1
        
        for day_index in range(total_days):
            current_date = self.start_of_month + timedelta(days=day_index)
            recorded_blocks = TimeBlock.objects.filter(
                user=user,
                date=current_date
            ).count()
            
            empty_blocks = TOTAL_SLOTS_PER_DAY - recorded_blocks
            if empty_blocks > 0:
                empty_minutes = empty_blocks * MINUTES_PER_SLOT
                self.add_unclassified_data(tag_analysis_data, empty_minutes, data_type='analysis')

@login_required
def index(request):
    """
    통계 메인 페이지 - Django 템플릿 기반으로 데이터 처리
    """
    # 기본 날짜 설정 (core 유틸리티 사용)
    selected_date = safe_date_parse(request.GET.get('date'))
    
    # 통계 계산기 초기화
    calculator = StatsCalculator(request.user, selected_date)
    
    # 선택된 날짜가 속한 월의 통계 데이터만 계산
    monthly_blocks = TimeBlock.objects.filter(
        user=request.user,
        date__range=[calculator.start_of_month, calculator.end_of_month]
    )
    
    total_blocks = monthly_blocks.count()
    total_days = monthly_blocks.values('date').distinct().count()
    
    # 일별 통계 데이터 생성
    daily_stats = get_daily_stats_data(request.user, selected_date, calculator)
    
    # 주간 통계 데이터 생성
    weekly_stats = get_weekly_stats_data(request.user, selected_date, calculator)
    
    # 월간 통계 데이터 생성
    monthly_stats = get_monthly_stats_data(request.user, selected_date, calculator)
    
    # 태그 분석 데이터 생성 (선택된 월의 데이터만)
    tag_analysis = get_tag_analysis_data(request.user, selected_date, calculator)
    
    # JavaScript용 데이터 준비 (날짜 객체를 문자열로 변환)
    daily_stats_for_js = {
        'tag_stats': daily_stats['tag_stats'],
        'hourly_stats': daily_stats['hourly_stats']
    }
    
    weekly_stats_for_js = {
        'weekly_data': [{
            'day_korean': day['day_korean'],
            'total_hours': day['total_hours']
        } for day in weekly_stats['weekly_data']],
        'tag_weekly_stats': weekly_stats['tag_weekly_stats']
    }
    
    context = {
        'page_title': '통계',
        'selected_date': selected_date,
        'total_blocks': total_blocks,
        'total_days': total_days,
        'total_hours': round(total_blocks * 10 / 60, 1),
        'daily_stats': daily_stats,
        'weekly_stats': weekly_stats,
        'monthly_stats': monthly_stats,
        'tag_analysis': tag_analysis,
        # JavaScript에서 사용할 수 있도록 JSON 문자열로 변환 (core 함수 사용)
        'daily_stats_json': serialize_for_js(daily_stats_for_js),
        'weekly_stats_json': serialize_for_js(weekly_stats_for_js),
        'tag_analysis_json': serialize_for_js(tag_analysis),
        'monthly_stats_json': serialize_for_js({
            'day_labels': monthly_stats['day_labels'],
            'tag_stats': monthly_stats['tag_stats'],
            'daily_totals': monthly_stats['daily_totals']
        }),
    }
    return render(request, 'stats/index.html', context)

def get_daily_stats_data(user, selected_date, calculator):
    """일별 통계 데이터 생성"""
    time_blocks = TimeBlock.objects.filter(
        user=user,
        date=selected_date
    ).select_related('tag')
    
    # 태그별 시간 집계
    tag_stats = {}
    hourly_stats = [{} for _ in range(24)]
    active_blocks_count = 0  # 미분류 제외한 실제 활동 블록 수
    
    def process_block(block, tag_info):
        nonlocal active_blocks_count
        
        tag_name = tag_info['name']
        tag_color = tag_info['color']
        
        if tag_name not in tag_stats:
            tag_stats[tag_name] = {
                'name': tag_name,
                'color': tag_color,
                'minutes': 0,
                'blocks': 0
            }
        
        tag_stats[tag_name]['minutes'] += MINUTES_PER_SLOT
        tag_stats[tag_name]['blocks'] += 1
        
        # 실제 활동 블록 카운트 (미분류 제외)
        if tag_name != UNCLASSIFIED_TAG_NAME:
            active_blocks_count += 1
        
        hour = block.slot_index // SLOTS_PER_HOUR
        hourly_stats[hour][tag_name] = hourly_stats[hour].get(tag_name, 0) + MINUTES_PER_SLOT
    
    calculator.process_blocks_without_tag(time_blocks, process_block)
    
    # 빈 슬롯을 미분류로 채우기
    calculator.fill_empty_slots_daily(time_blocks, tag_stats, hourly_stats)
    
    # 시간 단위로 변환
    for tag_data in tag_stats.values():
        tag_data['hours'] = round(tag_data['minutes'] / 60, 1)
    
    # 가장 활발한 시간 계산
    peak_hour = -1
    max_minutes = -1
    for hour, hour_data in enumerate(hourly_stats):
        total_minutes = sum(hour_data.values())
        if total_minutes > max_minutes:
            max_minutes = total_minutes
            peak_hour = hour
    
    return {
        'date': selected_date,
        'tag_stats': sorted(tag_stats.values(), key=lambda x: x['minutes'], reverse=True),
        'hourly_stats': hourly_stats,
        'total_blocks': TOTAL_SLOTS_PER_DAY,
        'total_hours': 24.0,
        'active_hours': round(active_blocks_count * MINUTES_PER_SLOT / 60, 1),  # 미분류 제외한 실제 활동 시간
        'fill_percentage': round((len(time_blocks) / TOTAL_SLOTS_PER_DAY) * 100, 1),
        'peak_hour': peak_hour,
        'max_minutes': max_minutes,
        'top_tag': sorted(tag_stats.values(), key=lambda x: x['minutes'], reverse=True)[0] if tag_stats else None
    }

def get_weekly_stats_data(user, selected_date, calculator):
    """주간 통계 데이터 생성"""
    week_dates = [calculator.start_of_week + timedelta(days=i) for i in range(7)]
    
    weekly_data = []
    tag_weekly_stats = {}
    excluded_tags = {SLEEP_TAG_NAME}  # 미분류는 제외하지 않음
    
    for date_item in week_dates:
        daily_blocks = TimeBlock.objects.filter(
            user=user,
            date=date_item
        ).select_related('tag')
        
        daily_tag_stats = {}
        active_blocks_count = 0
        active_minutes = 0
        
        def process_block(block, tag_info):
            nonlocal active_blocks_count, active_minutes
            
            tag_name = tag_info['name']
            tag_color = tag_info['color']
            
            if tag_name not in daily_tag_stats:
                daily_tag_stats[tag_name] = 0
            daily_tag_stats[tag_name] += MINUTES_PER_SLOT
            
            if tag_name not in excluded_tags:
                active_blocks_count += 1
                active_minutes += 10
            
            if tag_name not in tag_weekly_stats:
                tag_weekly_stats[tag_name] = {
                    'name': tag_name,
                    'color': tag_color,
                    'daily_minutes': [0] * 7
                }
            
            day_index = (date_item - calculator.start_of_week).days
            tag_weekly_stats[tag_name]['daily_minutes'][day_index] += 10
        
        calculator.process_blocks_without_tag(daily_blocks, process_block)
        
        # 빈 슬롯을 미분류로 채우기
        calculator.fill_empty_slots_weekly(daily_blocks, daily_tag_stats, tag_weekly_stats, date_item)
        
        weekly_data.append({
            'date': date_item,
            'day_name': date_item.strftime('%a'),
            'day_korean': ['월', '화', '수', '목', '금', '토', '일'][date_item.weekday()],
            'total_blocks': active_blocks_count,
            'total_minutes': active_minutes,
            'total_hours': round(active_minutes / 60, 1),
            'fill_percentage': round((len(daily_blocks) / 144) * 100, 1),
            'tag_stats': daily_tag_stats
        })
    
    for tag_data in tag_weekly_stats.values():
        tag_data['total_hours'] = round(sum(tag_data['daily_minutes']) / 60, 1)
        tag_data['daily_hours'] = [round(m / 60, 1) for m in tag_data['daily_minutes']]
        # 주간 평균시간 계산 (활동한 요일 기준)
        active_days = sum(1 for minutes in tag_data['daily_minutes'] if minutes > 0)
        tag_data['avg_hours'] = round(tag_data['total_hours'] / active_days, 1) if active_days > 0 else 0
    
    # 활동한 요일 수 계산
    active_days = sum(1 for day in weekly_data if day['total_blocks'] > 0)
    
    return {
        'start_date': calculator.start_of_week,
        'end_date': week_dates[-1],
        'weekly_data': weekly_data,
        'tag_weekly_stats': list(tag_weekly_stats.values()),
        'week_total_hours': round(sum(day['total_minutes'] for day in weekly_data) / 60, 1),
        'active_days': active_days
    }

def get_monthly_stats_data(user, selected_date, calculator):
    """월간 통계 데이터 생성 - 선 그래프용"""
    monthly_blocks = TimeBlock.objects.filter(
        user=user,
        date__range=[calculator.start_of_month, calculator.end_of_month]
    ).select_related('tag')
    
    # 월의 총 일수
    total_days = (calculator.end_of_month - calculator.start_of_month).days + 1
    
    # 일별 태그 사용량 집계
    daily_tag_stats = {}  # {tag_name: [day1_hours, day2_hours, ...]}
    daily_totals = [0] * total_days  # 일별 총 사용 시간
    
    def process_block(block, tag_info):
        tag_name = tag_info['name']
        tag_color = tag_info['color']
        
        # 해당 일의 인덱스 (0부터 시작)
        day_index = (block.date - calculator.start_of_month).days
        
        # 태그별 일별 사용량 초기화
        if tag_name not in daily_tag_stats:
            daily_tag_stats[tag_name] = {
                'name': tag_name,
                'color': tag_color,
                'daily_hours': [0] * total_days,
                'total_hours': 0
            }
        
        # 10분 = 1/6 시간
        hours_increment = MINUTES_PER_SLOT / 60
        daily_tag_stats[tag_name]['daily_hours'][day_index] += hours_increment
        daily_tag_stats[tag_name]['total_hours'] += hours_increment
        daily_totals[day_index] += hours_increment
    
    calculator.process_blocks_without_tag(monthly_blocks, process_block)
    
    # 빈 슬롯을 미분류로 채우기
    calculator.fill_empty_slots_monthly(user, daily_tag_stats, daily_totals, total_days)
    
    # 시간 반올림
    for tag_data in daily_tag_stats.values():
        tag_data['daily_hours'] = [round(h, 1) for h in tag_data['daily_hours']]
        tag_data['total_hours'] = round(tag_data['total_hours'], 1)
        # 월간 평균시간 계산 (활동한 일 기준)
        active_days = sum(1 for hours in tag_data['daily_hours'] if hours > 0)
        tag_data['avg_hours'] = round(tag_data['total_hours'] / active_days, 1) if active_days > 0 else 0
    
    daily_totals = [round(h, 1) for h in daily_totals]
    
    # 일별 라벨 생성 (1일, 2일, ...)
    day_labels = [f"{i+1}일" for i in range(total_days)]
    
    # 태그별 통계를 사용량 순으로 정렬
    tag_list = sorted(daily_tag_stats.values(), key=lambda x: x['total_hours'], reverse=True)
    
    return {
        'month': selected_date.strftime('%Y-%m'),
        'start_date': calculator.start_of_month,
        'end_date': calculator.end_of_month,
        'day_labels': day_labels,
        'tag_stats': tag_list,
        'daily_totals': daily_totals,
        'total_hours': round(sum(daily_totals), 1),
        'active_days': len([d for d in daily_totals if d > 0]),
        'total_days': total_days,
        'avg_daily_hours': round(sum(daily_totals) / total_days, 1)
    }

def get_tag_analysis_data(user, selected_date, calculator):
    """태그 분석 데이터 생성 (선택된 월의 데이터만)"""
    monthly_blocks = TimeBlock.objects.filter(
        user=user,
        date__range=[calculator.start_of_month, calculator.end_of_month]
    ).select_related('tag')
    
    tag_analysis_data = {}
    
    def process_block(block, tag_info):
        tag_name = tag_info['name']
        tag_color = tag_info['color']
        
        if tag_name not in tag_analysis_data:
            tag_analysis_data[tag_name] = {
                'name': tag_name,
                'color': tag_color,
                'total_minutes': 0,
                'total_blocks': 0,
            }
        
        tag_analysis_data[tag_name]['total_minutes'] += MINUTES_PER_SLOT
        tag_analysis_data[tag_name]['total_blocks'] += 1
    
    calculator.process_blocks_without_tag(monthly_blocks, process_block)
    
    # 빈 슬롯을 미분류로 채우기
    calculator.fill_empty_slots_analysis(user, tag_analysis_data)
    
    analysis_list = []
    for tag_name, data in tag_analysis_data.items():
        analysis_list.append({
            'name': data['name'],
            'color': data['color'],
            'total_hours': round(data['total_minutes'] / 60, 1),
            'total_blocks': data['total_blocks'],
        })
    
    # 사용량 순으로 정렬
    return sorted(analysis_list, key=lambda x: x['total_hours'], reverse=True)
