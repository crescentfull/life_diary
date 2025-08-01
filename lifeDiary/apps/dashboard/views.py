from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods, require_GET

import json
from django.db.models import Q

from apps.tags.models import Tag
from .models import TimeBlock
from apps.core.utils import (
    safe_date_parse,
    serialize_for_js,
    calculate_time_statistics,
    success_response,
    error_response,
    TOTAL_SLOTS_PER_DAY,
    get_time_from_slot,
)


@login_required
@require_GET
def dashboard_view(request):
    """
    메인 대시보드 - Django 템플릿 기반으로 초기 데이터 렌더링
    """
    selected_date = safe_date_parse(request.GET.get("date"))

    # 시간 블록 데이터 조회
    time_blocks = TimeBlock.objects.filter(
        user=request.user, date=selected_date
    ).select_related("tag")
    slot_data = {
        block.slot_index: {"tag": block.tag, "memo": block.memo, "id": block.id}
        for block in time_blocks
    }

    # 144개 슬롯 생성 (00:00 ~ 23:50, 10분 단위)
    slots = []
    for i in range(TOTAL_SLOTS_PER_DAY):
        hour, minute = get_time_from_slot(i)
        slots.append(
            {
                "index": i,
                "hour": hour,
                "minute": minute,
                "time_str": f"{hour:02d}:{minute:02d}",
                "data": slot_data.get(i),
            }
        )

    # 사용자의 모든 태그 + 공용 기본 태그 조회 (기본 태그 우선)
    user_tags = Tag.objects.filter(Q(user=request.user) | Q(is_default=True)).order_by(
        "-is_default", "name"
    )

    # 통계 계산 (core 유틸리티 사용)
    stats = calculate_time_statistics(len(slot_data))

    # 시간 헤더 (1분, 11분, 21분, 31분, 41분, 51분)
    time_headers = [f"{(i * 10 - 1) % 60 + 1}분" for i in range(1, 13)]

    context = {
        "page_title": "대시보드",
        "selected_date": selected_date,
        "slots": slots,
        "user_tags": user_tags,
        "total_slots": len(slots),
        "filled_slots": len(slot_data),
        "fill_percentage": stats["fill_percentage"],
        "total_hours": stats["hours"],
        "remaining_minutes": stats["remaining_minutes"],
        "time_headers": time_headers,
        # JavaScript에서 사용할 데이터 (core 직렬화 함수 사용)
        "tags_json": serialize_for_js(
            [
                {
                    "id": tag.id,
                    "name": tag.name,
                    "color": tag.color,
                    "is_default": tag.is_default,
                }
                for tag in user_tags
            ]
        ),
    }

    return render(request, "dashboard/index.html", context)


@login_required
@require_http_methods(["POST", "DELETE"])
def time_block_api(request):
    """
    RESTful 시간 블록 API (core 유틸리티 사용)
    POST: 시간 블록 생성/수정
    DELETE: 시간 블록 삭제

    외부 프론트엔드(React 등)에서도 사용 가능한 표준 API
    """
    try:
        data = json.loads(request.body)
        slot_indexes = data.get("slot_indexes", [])
        selected_date_str = data.get("date")

        # 입력 검증
        if not slot_indexes:
            return error_response("슬롯 인덱스가 누락되었습니다.", "MISSING_SLOTS")

        if not selected_date_str:
            return error_response("날짜가 누락되었습니다.", "MISSING_DATE")

        # 날짜 파싱 (core 유틸리티 사용)
        selected_date = safe_date_parse(selected_date_str)
        if not selected_date:
            return error_response(
                "올바른 날짜 형식(YYYY-MM-DD)을 사용해주세요.", "INVALID_DATE_FORMAT"
            )

    except json.JSONDecodeError:
        return error_response("올바른 JSON 형식이 아닙니다.", "INVALID_JSON")

    if request.method == "POST":
        return _handle_time_block_create_update(
            request, data, slot_indexes, selected_date
        )
    elif request.method == "DELETE":
        return _handle_time_block_delete(request, slot_indexes, selected_date)


def _handle_time_block_create_update(request, data, slot_indexes, selected_date):
    """시간 블록 생성/수정 처리 (core 유틸리티 사용)"""
    try:
        tag_id = data.get("tag_id")
        memo = data.get("memo", "")

        if not tag_id:
            return error_response("태그가 선택되지 않았습니다.", "MISSING_TAG")

        # 태그 존재 확인 (사용자 태그 + 기본 태그)
        try:
            tag = Tag.objects.get(
                Q(id=tag_id, user=request.user) | Q(id=tag_id, is_default=True)
            )
        except Tag.DoesNotExist:
            return error_response(
                "존재하지 않는 태그이거나 접근 권한이 없습니다.", "TAG_NOT_FOUND", 404
            )

        # 기존 블록 조회
        existing_blocks = TimeBlock.objects.filter(
            user=request.user, date=selected_date, slot_index__in=slot_indexes
        )
        existing_slots = {block.slot_index: block for block in existing_blocks}

        # 생성/수정할 블록 분류
        time_blocks_to_create = []
        time_blocks_to_update = []

        for slot_index in slot_indexes:
            if slot_index in existing_slots:
                # 기존 블록 수정
                block = existing_slots[slot_index]
                block.tag = tag
                block.memo = memo
                time_blocks_to_update.append(block)
            else:
                # 새 블록 생성
                time_blocks_to_create.append(
                    TimeBlock(
                        user=request.user,
                        date=selected_date,
                        slot_index=slot_index,
                        tag=tag,
                        memo=memo,
                    )
                )

        # 데이터베이스 업데이트
        created_count = 0
        updated_count = 0

        if time_blocks_to_create:
            TimeBlock.objects.bulk_create(time_blocks_to_create)
            created_count = len(time_blocks_to_create)

        if time_blocks_to_update:
            TimeBlock.objects.bulk_update(time_blocks_to_update, ["tag", "memo"])
            updated_count = len(time_blocks_to_update)

        return success_response(
            f"{len(slot_indexes)}개의 슬롯이 저장되었습니다.",
            {
                "created_count": created_count,
                "updated_count": updated_count,
                "total_count": len(slot_indexes),
                "tag": {"id": tag.id, "name": tag.name, "color": tag.color},
            },
            201,
        )

    except Exception as e:
        return error_response(
            f"저장 중 오류가 발생했습니다: {str(e)}", "SERVER_ERROR", 500
        )


def _handle_time_block_delete(request, slot_indexes, selected_date):
    """시간 블록 삭제 처리 (core 유틸리티 사용)"""
    try:
        deleted_count, _ = TimeBlock.objects.filter(
            user=request.user, date=selected_date, slot_index__in=slot_indexes
        ).delete()

        if deleted_count == 0 and len(slot_indexes) > 0:
            return error_response("삭제할 기록이 없습니다.", "NO_BLOCKS_FOUND", 404)

        return success_response(
            f"{deleted_count}개의 슬롯이 삭제되었습니다.",
            {"deleted_count": deleted_count, "requested_count": len(slot_indexes)},
        )

    except Exception as e:
        return error_response(
            f"삭제 중 오류가 발생했습니다: {str(e)}", "SERVER_ERROR", 500
        )
