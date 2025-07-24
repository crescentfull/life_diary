from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models import Q
from datetime import datetime, date
import json

from apps.tags.models import Tag
from .models import TimeBlock

# 유틸리티 함수들
def parse_date(date_str):
    """날짜 문자열을 안전하게 파싱하는 유틸리티 함수"""
    if not date_str:
        return date.today()
    
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return date.today()

def create_slot_data(time_blocks):
    """시간 블록들을 슬롯 데이터로 변환하는 유틸리티 함수"""
    return {
        block.slot_index: {
            'tag': block.tag,
            'memo': block.memo,
            'id': block.id
        }
        for block in time_blocks
    }

def create_slots_list(slot_data):
    """144개 슬롯 리스트를 생성하는 유틸리티 함수"""
    return [
        {
            'index': i,
            'hour': i // 6,
            'minute': (i % 6) * 10,
            'time_str': f"{i // 6:02d}:{(i % 6) * 10:02d}",
            'data': slot_data.get(i)
        }
        for i in range(144)
    ]

def calculate_time_stats(slot_data):
    """시간 통계를 계산하는 유틸리티 함수"""
    total_minutes = len(slot_data) * 10
    return {
        'total_hours': total_minutes // 60,
        'remaining_minutes': total_minutes % 60,
        'fill_percentage': round((len(slot_data) / 144) * 100, 1) if slot_data else 0
    }

def generate_time_headers():
    """시간 헤더를 생성하는 유틸리티 함수"""
    time_headers = []
    for i in range(1, 13):
        minute = i * 10
        if minute > 60:
            minute = minute % 60
            if minute == 0:
                minute = 60
        time_headers.append(f"{minute}분")
    return time_headers

# API 응답 헬퍼
def success_response(message, **extra_data):
    """성공 응답을 생성하는 헬퍼 함수"""
    response_data = {'success': True, 'message': message}
    response_data.update(extra_data)
    return JsonResponse(response_data)

def error_response(message, status=400):
    """에러 응답을 생성하는 헬퍼 함수"""
    return JsonResponse({
        'success': False,
        'message': message
    }, status=status)

# Views
@login_required
@ensure_csrf_cookie
def index(request):
    """메인 대시보드 - 144칸 시간 그리드 표시"""
    selected_date = parse_date(request.GET.get('date'))
    
    # 해당 날짜의 시간 블록들 가져오기
    time_blocks = TimeBlock.objects.filter(
        user=request.user,
        date=selected_date
    ).select_related('tag')
    
    # 데이터 처리
    slot_data = create_slot_data(time_blocks)
    slots = create_slots_list(slot_data)
    time_stats = calculate_time_stats(slot_data)
    
    context = {
        'selected_date': selected_date,
        'slots': slots,
        'total_slots': 144,
        'filled_slots': len(slot_data),
        'time_headers': generate_time_headers(),
        **time_stats
    }
    
    return render(request, 'dashboard/index.html', context)

@login_required
def time_blocks_handler(request):
    """RESTful 시간 블록 핸들러 - HTTP 메소드에 따라 분기"""
    if request.method == 'GET':
        return list_time_blocks(request)
    elif request.method == 'POST':
        return create_time_blocks(request)
    elif request.method == 'DELETE':
        return delete_time_blocks(request)
    else:
        return error_response('지원하지 않는 HTTP 메소드입니다.', status=405)

@login_required  
def get_slot_data(request, slot_index):
    """특정 슬롯의 데이터를 JSON으로 반환"""
    if slot_index < 0 or slot_index > 143:
        return error_response('잘못된 슬롯 인덱스입니다.', status=400)
    
    selected_date = parse_date(request.GET.get('date'))
    
    try:
        time_block = TimeBlock.objects.select_related('tag').get(
            user=request.user,
            date=selected_date,
            slot_index=slot_index
        )
        return JsonResponse({
            'exists': True,
            'tag_id': time_block.tag.id,
            'tag_name': time_block.tag.name,
            'tag_color': time_block.tag.color,
            'memo': time_block.memo,
            'time_range': time_block.get_time_range()
        })
    except TimeBlock.DoesNotExist:
        hour, minute = TimeBlock.slot_index_to_time(slot_index)
        return JsonResponse({
            'exists': False,
            'time_range': f"{hour:02d}:{minute:02d}-{hour:02d}:{minute+10:02d}"
        })

def list_time_blocks(request):
    """시간 블록 목록 조회 (RESTful)"""
    selected_date = parse_date(request.GET.get('date'))
    
    time_blocks = TimeBlock.objects.filter(
        user=request.user,
        date=selected_date
    ).select_related('tag').values(
        'slot_index', 'tag__name', 'tag__color', 'memo'
    )
    
    return JsonResponse({
        'success': True,
        'data': list(time_blocks),
        'date': selected_date.isoformat()
    })

def create_time_blocks(request):
    """시간 블록 생성 (RESTful)"""
    try:
        data = json.loads(request.body)
        slot_indexes = data.get('slot_indexes', [])
        tag_id = data.get('tag_id')
        memo = data.get('memo', '')
        selected_date = parse_date(data.get('date'))
        
        # 입력 검증 강화
        if not slot_indexes or not tag_id:
            return error_response('슬롯과 태그를 선택해주세요.')
        
        if not isinstance(slot_indexes, list) or len(slot_indexes) > 144:
            return error_response('잘못된 슬롯 데이터입니다.')
        
        if any(not isinstance(idx, int) or idx < 0 or idx > 143 for idx in slot_indexes):
            return error_response('잘못된 슬롯 인덱스입니다.')
        
        # 태그 확인
        tag = get_object_or_404(
            Tag, 
            Q(is_default=True) | Q(user=request.user),
            id=tag_id
        )
        
        # 기존 TimeBlock들 삭제 후 새로 생성
        TimeBlock.objects.filter(
            user=request.user,
            date=selected_date,
            slot_index__in=slot_indexes
        ).delete()
        
        # 벌크 생성으로 성능 최적화
        time_blocks = [
            TimeBlock(
                user=request.user,
                date=selected_date,
                slot_index=slot_index,
                tag=tag,
                memo=memo
            )
            for slot_index in slot_indexes
        ]
        
        TimeBlock.objects.bulk_create(time_blocks)
        
        return success_response(
            f'{len(slot_indexes)}개 슬롯이 저장되었습니다.',
            tag_name=tag.name,
            tag_color=tag.color
        )
        
    except json.JSONDecodeError:
        return error_response('잘못된 JSON 형식입니다.', status=400)
    except Exception as e:
        return error_response(f'저장 중 오류가 발생했습니다: {str(e)}')

def delete_time_blocks(request):
    """시간 블록 삭제 (RESTful)"""
    try:
        data = json.loads(request.body)
        slot_indexes = data.get('slot_indexes', [])
        selected_date = parse_date(data.get('date'))
        
        # 입력 검증 강화
        if not slot_indexes:
            return error_response('삭제할 슬롯을 선택해주세요.')
        
        if not isinstance(slot_indexes, list) or len(slot_indexes) > 144:
            return error_response('잘못된 슬롯 데이터입니다.')
        
        if any(not isinstance(idx, int) or idx < 0 or idx > 143 for idx in slot_indexes):
            return error_response('잘못된 슬롯 인덱스입니다.')
        
        # 삭제 실행
        deleted_count, _ = TimeBlock.objects.filter(
            user=request.user,
            date=selected_date,
            slot_index__in=slot_indexes
        ).delete()
        
        return success_response(f'{deleted_count}개 슬롯이 삭제되었습니다.')
        
    except json.JSONDecodeError:
        return error_response('잘못된 JSON 형식입니다.', status=400)
    except Exception as e:
        return error_response(f'삭제 중 오류가 발생했습니다: {str(e)}')


