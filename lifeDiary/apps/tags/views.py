from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError
import json

from .models import Tag
from apps.dashboard.models import TimeBlock

# 유틸리티 함수들
def success_response(message, **extra_data):
    """성공 응답 헬퍼"""
    response_data = {'success': True, 'message': message}
    response_data.update(extra_data)
    return JsonResponse(response_data)

def error_response(message, status=400):
    """에러 응답 헬퍼"""
    return JsonResponse({'success': False, 'message': message}, status=status)

def validate_tag_data(data):
    """태그 데이터 유효성 검사"""
    name = data.get('name', '').strip()
    color = data.get('color', '').strip()
    
    if not name:
        return None, "태그명을 입력해주세요."
    
    if not color:
        return None, "색상을 선택해주세요."
    
    if len(name) > 50:
        return None, "태그명은 50자 이하로 입력해주세요."
    
    # HEX 색상 코드 검증
    import re
    if not re.match(r'^#[0-9A-Fa-f]{6}$', color):
        return None, "올바른 HEX 색상 코드를 입력해주세요."
    
    return {'name': name, 'color': color}, None

def check_tag_permission(user, tag, action='edit'):
    """태그 권한 확인"""
    if user.is_superuser:
        return True, None
    
    if tag.is_default:
        return False, f"기본 태그는 관리자만 {action}할 수 있습니다."
    
    if tag.user != user:
        return False, f"본인의 태그만 {action}할 수 있습니다."
    
    return True, None

def check_tag_duplicate(name, user, exclude_id=None):
    """태그명 중복 확인"""
    query = Q(is_default=True, name=name) | Q(user=user, name=name)
    
    if exclude_id:
        query = query & ~Q(id=exclude_id)
    
    return Tag.objects.filter(query).exists()

def serialize_tag(tag, user):
    """태그 직렬화"""
    can_edit, _ = check_tag_permission(user, tag, 'edit')
    can_delete, _ = check_tag_permission(user, tag, 'delete')
    
    return {
        'id': tag.id,
        'name': tag.name,
        'color': tag.color,
        'is_default': tag.is_default,
        'can_edit': can_edit,
        'can_delete': can_delete
    }

# 메인 뷰들
@login_required
@ensure_csrf_cookie
def index(request: HttpRequest) -> HttpResponse:
    """태그 관리 페이지"""
    context = {
        'page_title': '태그 관리'
    }
    return render(request, 'tags/index.html', context)

@login_required
@require_http_methods(["GET", "POST"])
def tags_handler(request):
    """RESTful 태그 핸들러 - HTTP 메소드에 따라 분기"""
    if request.method == 'GET':
        return list_tags(request)
    elif request.method == 'POST':
        return create_tag_view(request)
    else:
        return error_response('지원하지 않는 HTTP 메소드입니다.', status=405)

@login_required 
@require_http_methods(["GET", "PUT", "DELETE"])
def tag_detail_handler(request, tag_id):
    """RESTful 개별 태그 핸들러"""
    if request.method == 'GET':
        return get_tag_detail(request, tag_id)
    elif request.method == 'PUT':
        return update_tag_view(request, tag_id)
    elif request.method == 'DELETE':
        return delete_tag_view(request, tag_id)
    else:
        return error_response('지원하지 않는 HTTP 메소드입니다.', status=405)

# API 구현 함수들
def list_tags(request):
    """사용자가 사용 가능한 모든 태그 조회 (기본 태그 + 개인 태그)"""
    try:
        tags = Tag.objects.filter(
            Q(is_default=True) | Q(user=request.user)
        ).order_by('is_default', 'name')
        
        tag_list = [serialize_tag(tag, request.user) for tag in tags]
        
        return success_response('태그 목록을 불러왔습니다.', tags=tag_list)
        
    except Exception as e:
        return error_response(f'태그 조회 중 오류가 발생했습니다: {str(e)}')

def get_tag_detail(request, tag_id):
    """특정 태그 상세 조회"""
    try:
        tag = get_object_or_404(Tag, id=tag_id)
        
        # 기본 태그이거나 본인 태그만 조회 가능
        if not tag.is_default and tag.user != request.user and not request.user.is_superuser:
            return error_response('접근 권한이 없습니다.', status=403)
        
        tag_data = serialize_tag(tag, request.user)
        
        # 사용량 정보 추가
        usage_count = TimeBlock.objects.filter(tag=tag).count()
        tag_data['usage_count'] = usage_count
        
        return success_response('태그 정보를 불러왔습니다.', tag=tag_data)
        
    except Exception as e:
        return error_response(f'태그 조회 중 오류가 발생했습니다: {str(e)}')

def create_tag_view(request):
    """새 태그 생성"""
    try:
        data = json.loads(request.body)
        validated_data, error_msg = validate_tag_data(data)
        
        if error_msg:
            return error_response(error_msg, status=400)
        
        is_default = data.get('is_default', False)
        
        # 일반 사용자는 기본 태그 생성 불가
        if is_default and not request.user.is_superuser:
            return error_response('기본 태그는 관리자만 생성할 수 있습니다.', status=403)
        
        # 중복 확인
        if check_tag_duplicate(validated_data['name'], request.user):
            return error_response('이미 같은 이름의 태그가 존재합니다.', status=400)
        
        # 새 태그 생성
        tag = Tag.objects.create(
            user=None if is_default else request.user,
            name=validated_data['name'],
            color=validated_data['color'],
            is_default=is_default
        )
        
        tag_data = serialize_tag(tag, request.user)
        message = f'{"기본 " if is_default else ""}태그가 생성되었습니다.'
        
        return success_response(message, tag=tag_data)
        
    except json.JSONDecodeError:
        return error_response('잘못된 JSON 형식입니다.', status=400)
    except Exception as e:
        return error_response(f'태그 생성 중 오류가 발생했습니다: {str(e)}')

def update_tag_view(request, tag_id):
    """태그 수정"""
    try:
        tag = get_object_or_404(Tag, id=tag_id)
        
        # 권한 확인
        has_permission, error_msg = check_tag_permission(request.user, tag, '수정')
        if not has_permission:
            return error_response(error_msg, status=403)
        
        data = json.loads(request.body)
        validated_data, error_msg = validate_tag_data(data)
        
        if error_msg:
            return error_response(error_msg, status=400)
        
        is_default = data.get('is_default', tag.is_default)
        
        # 일반 사용자는 기본 태그로 변경 불가
        if is_default and not request.user.is_superuser:
            return error_response('기본 태그는 관리자만 설정할 수 있습니다.', status=403)
        
        # 중복 확인 (자신 제외)
        if check_tag_duplicate(validated_data['name'], request.user, exclude_id=tag.id):
            return error_response('이미 같은 이름의 태그가 존재합니다.', status=400)
        
        # 태그 수정
        tag.name = validated_data['name']
        tag.color = validated_data['color']
        tag.is_default = is_default
        tag.user = None if is_default else request.user
        tag.save()
        
        tag_data = serialize_tag(tag, request.user)
        message = f'{"기본 " if tag.is_default else ""}태그가 수정되었습니다.'
        
        return success_response(message, tag=tag_data)
        
    except json.JSONDecodeError:
        return error_response('잘못된 JSON 형식입니다.', status=400)
    except Exception as e:
        return error_response(f'태그 수정 중 오류가 발생했습니다: {str(e)}')

def delete_tag_view(request, tag_id):
    """태그 삭제"""
    try:
        tag = get_object_or_404(Tag, id=tag_id)
        
        # 권한 확인
        has_permission, error_msg = check_tag_permission(request.user, tag, '삭제')
        if not has_permission:
            return error_response(error_msg, status=403)
        
        # 사용 중인 태그인지 확인
        usage_count = TimeBlock.objects.filter(tag=tag).count()
        if usage_count > 0:
            return error_response(
                f'이 태그는 {usage_count}개의 시간 블록에서 사용 중이어서 삭제할 수 없습니다.',
                status=400
            )
        
        tag_name = tag.name
        is_default = tag.is_default
        tag.delete()
        
        message = f'"{tag_name}" {"기본 " if is_default else ""}태그가 삭제되었습니다.'
        return success_response(message)
        
    except Exception as e:
        return error_response(f'태그 삭제 중 오류가 발생했습니다: {str(e)}')

# 레거시 호환성을 위한 뷰들 (단계적 제거 예정)
@login_required
@require_http_methods(["POST"])
def create_tag(request):
    """레거시 태그 생성 (호환성용 - 단계적 제거 예정)"""
    return create_tag_view(request)

@login_required
@require_http_methods(["POST"]) 
def update_tag(request, tag_id):
    """레거시 태그 수정 (호환성용 - 단계적 제거 예정)"""
    return update_tag_view(request, tag_id)

@login_required
@require_http_methods(["POST"])
def delete_tag(request, tag_id):
    """레거시 태그 삭제 (호환성용 - 단계적 제거 예정)"""
    return delete_tag_view(request, tag_id)

@login_required
def get_tags(request):
    """레거시 태그 목록 조회 (호환성용 - 단계적 제거 예정)"""
    return list_tags(request)
