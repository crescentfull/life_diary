from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from datetime import datetime, date
from apps.tags.models import Tag
from .models import TimeBlock

# Create your views here.

@login_required
def index(request):
    """
    메인 대시보드 - 144칸 시간 그리드 표시
    """
    # 현재 날짜 (URL 파라미터로 변경 가능)
    selected_date_str = request.GET.get('date')
    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date() if selected_date_str else date.today()
    except ValueError:
        selected_date = date.today()
    
    # 사용자의 태그들 가져오기
    user_tags = Tag.objects.filter(user=request.user).order_by('name')
    
    # 해당 날짜의 시간 블록들 가져오기
    time_blocks = TimeBlock.objects.filter(
        user=request.user,
        date=selected_date
    ).select_related('tag')
    
    # 슬롯별로 매핑 - Dictionary comprehension 사용
    slot_data = {
        block.slot_index: {
            'tag': block.tag,
            'memo': block.memo,
            'id': block.id
        }
        for block in time_blocks
    }
    
    # 144개 슬롯 생성 (0~143) - List comprehension 사용
    slots = [
        {
            'index': i,
            'hour': i // 6,
            'minute': (i % 6) * 10,
            'time_str': f"{i // 6:02d}:{(i % 6) * 10:02d}",
            'data': slot_data.get(i)
        }
        for i in range(144)
    ]
    
    # 총 기록 시간 계산 (10분 단위)
    total_minutes = len(slot_data) * 10
    total_hours = total_minutes // 60
    remaining_minutes = total_minutes % 60
    
    # 시간 헤더 생성 (10, 20, 30, 40, 50, 60 반복)
    time_headers = []
    for i in range(1, 13):
        minute = i * 10  # 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120
        if minute > 60:
            minute = minute % 60  # 60 초과시 60으로 나눈 나머지
            if minute == 0:
                minute = 60
        time_headers.append(f"{minute}분")
    
    context = {
        'selected_date': selected_date,
        'slots': slots,
        'user_tags': user_tags,
        'total_slots': len(slots),
        'filled_slots': len(slot_data),
        'fill_percentage': round((len(slot_data) / 144) * 100, 1) if slot_data else 0,
        'total_hours': total_hours,
        'remaining_minutes': remaining_minutes,
        'time_headers': time_headers,
    }
    
    return render(request, 'dashboard/index.html', context)

@login_required  
def get_slot_data(request, slot_index):
    """
    특정 슬롯의 데이터를 JSON으로 반환
    """
    selected_date_str = request.GET.get('date', date.today().strftime('%Y-%m-%d'))
    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
    except ValueError:
        selected_date = date.today()
    
    try:
        time_block = TimeBlock.objects.select_related('tag').get(
            user=request.user,
            date=selected_date,
            slot_index=slot_index
        )
        data = {
            'exists': True,
            'tag_id': time_block.tag.id,
            'tag_name': time_block.tag.name,
            'tag_color': time_block.tag.color,
            'memo': time_block.memo,
            'time_range': time_block.get_time_range()
        }
    except TimeBlock.DoesNotExist:
        hour, minute = TimeBlock.slot_index_to_time(slot_index)
        data = {
            'exists': False,
            'time_range': f"{hour:02d}:{minute:02d}-{hour:02d}:{minute+10:02d}"
        }
    
    return JsonResponse(data)
