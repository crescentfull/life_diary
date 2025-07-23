from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import models
from django.db.models import Q
from datetime import datetime, date
import json

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
    
    # 태그는 JavaScript에서 동적으로 로드됨
    
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

@login_required
@require_http_methods(["POST"])
def save_time_blocks(request):
    """
    선택된 슬롯들에 태그를 저장
    """
    try:
        data = json.loads(request.body)
        slot_indexes = data.get('slot_indexes', [])
        tag_id = data.get('tag_id')
        memo = data.get('memo', '')
        selected_date_str = data.get('date')
        
        # 날짜 파싱
        try:
            selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            selected_date = date.today()
        
        # 태그 확인 (기본 태그 + 사용자 태그)
        tag = get_object_or_404(
            Tag, 
            Q(is_default=True) | Q(user=request.user),
            id=tag_id
        )
        
        # 기존 TimeBlock들 삭제 (선택된 슬롯들만)
        TimeBlock.objects.filter(
            user=request.user,
            date=selected_date,
            slot_index__in=slot_indexes
        ).delete()
        
        # 새 TimeBlock들 생성
        time_blocks = []
        for slot_index in slot_indexes:
            time_block = TimeBlock(
                user=request.user,
                date=selected_date,
                slot_index=slot_index,
                tag=tag,
                memo=memo
            )
            time_blocks.append(time_block)
        
        TimeBlock.objects.bulk_create(time_blocks)
        
        return JsonResponse({
            'success': True,
            'message': f'{len(slot_indexes)}개 슬롯이 저장되었습니다.',
            'tag_name': tag.name,
            'tag_color': tag.color
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'저장 중 오류가 발생했습니다: {str(e)}'
        }, status=400)

@login_required
@require_http_methods(["POST"])
def delete_time_blocks(request):
    """
    선택된 슬롯들의 데이터 삭제
    """
    try:
        data = json.loads(request.body)
        slot_indexes = data.get('slot_indexes', [])
        selected_date_str = data.get('date')
        
        # 날짜 파싱
        try:
            selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            selected_date = date.today()
        
        # 기존 TimeBlock들 삭제
        deleted_count = TimeBlock.objects.filter(
            user=request.user,
            date=selected_date,
            slot_index__in=slot_indexes
        ).delete()[0]
        
        return JsonResponse({
            'success': True,
            'message': f'{deleted_count}개 슬롯이 삭제되었습니다.'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'삭제 중 오류가 발생했습니다: {str(e)}'
        }, status=400)


