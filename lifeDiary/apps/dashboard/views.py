from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods, require_GET
from django.http import JsonResponse
from datetime import datetime, date
import json

from apps.tags.models import Tag
from .models import TimeBlock

@login_required
@require_GET
def dashboard_view(request):
    """
    메인 대시보드 - 144칸 시간 그리드 표시
    """
    selected_date_str = request.GET.get('date')
    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date() if selected_date_str else date.today()
    except ValueError:
        selected_date = date.today()
    
    time_blocks = TimeBlock.objects.filter(user=request.user, date=selected_date).select_related('tag')
    
    slot_data = {block.slot_index: {'tag': block.tag, 'memo': block.memo, 'id': block.id} for block in time_blocks}
    
    slots = [{
        'index': i,
        'hour': i // 6,
        'minute': (i % 6) * 10,
        'time_str': f"{i // 6:02d}:{(i % 6) * 10:02d}",
        'data': slot_data.get(i)
    } for i in range(144)]
    
    total_minutes = len(slot_data) * 10
    total_hours = total_minutes // 60
    remaining_minutes = total_minutes % 60
    
    time_headers = [f"{(i * 10 - 1) % 60 + 1}분" for i in range(1, 13)]
    
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
@require_http_methods(["POST", "DELETE"])
def time_block_api(request):
    """
    시간 블록 생성/수정 (POST) 또는 삭제 (DELETE)
    """
    try:
        data = json.loads(request.body)
        slot_indexes = data.get('slot_indexes', [])
        selected_date_str = data.get('date')

        if not slot_indexes or not selected_date_str:
            return JsonResponse({'success': False, 'message': '필수 데이터(슬롯, 날짜)가 누락되었습니다.'}, status=400)
        
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()

    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'success': False, 'message': '잘못된 형식의 요청입니다.'}, status=400)

    if request.method == 'POST':
        try:
            tag_id = data.get('tag_id')
            memo = data.get('memo', '')
            if not tag_id:
                 return JsonResponse({'success': False, 'message': '태그가 선택되지 않았습니다.'}, status=400)

            tag = get_object_or_404(Tag, id=tag_id)

            time_blocks_to_create = []
            time_blocks_to_update = []
            
            existing_blocks = TimeBlock.objects.filter(
                user=request.user,
                date=selected_date,
                slot_index__in=slot_indexes
            )
            existing_slots = {block.slot_index: block for block in existing_blocks}

            for slot_index in slot_indexes:
                if slot_index in existing_slots:
                    block = existing_slots[slot_index]
                    block.tag = tag
                    block.memo = memo
                    time_blocks_to_update.append(block)
                else:
                    time_blocks_to_create.append(
                        TimeBlock(user=request.user, date=selected_date, slot_index=slot_index, tag=tag, memo=memo)
                    )
            
            if time_blocks_to_create:
                TimeBlock.objects.bulk_create(time_blocks_to_create)
            if time_blocks_to_update:
                TimeBlock.objects.bulk_update(time_blocks_to_update, ['tag', 'memo'])
            
            return JsonResponse({'success': True, 'message': f'{len(slot_indexes)}개의 슬롯이 저장되었습니다.'}, status=201)
        
        except Tag.DoesNotExist:
            return JsonResponse({'success': False, 'message': '존재하지 않는 태그입니다.'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'저장 중 오류 발생: {e}'}, status=500)

    elif request.method == 'DELETE':
        try:
            deleted_count, _ = TimeBlock.objects.filter(
                user=request.user,
                date=selected_date,
                slot_index__in=slot_indexes
            ).delete()
            
            if deleted_count == 0 and len(slot_indexes) > 0:
                 return JsonResponse({'success': False, 'message': '삭제할 기록이 없습니다.'}, status=404)

            return JsonResponse({'success': True, 'message': f'{deleted_count}개의 슬롯이 삭제되었습니다.'})
        
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'삭제 중 오류 발생: {e}'}, status=500)


