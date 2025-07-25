from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.db import models
from django.db.models import Q
import json

from .models import Tag
from apps.dashboard.models import TimeBlock

# Create your views here.

@login_required
def index(request: HttpRequest) -> HttpResponse:
    """
    태그 관리 페이지
    """
    context = {
        'page_title': '태그 관리'
    }
    return render(request, 'tags/index.html', context)

@login_required
@require_http_methods(["POST"])
def create_tag(request):
    """
    새 태그 생성
    - 일반 사용자: 개인 태그만 생성 가능
    - 관리자(superuser): 기본 태그도 생성 가능
    """
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        color = data.get('color', '').strip()
        is_default = data.get('is_default', False)
        
        # 일반 사용자는 기본 태그 생성 불가
        if is_default and not request.user.is_superuser:
            return JsonResponse({
                'success': False,
                'message': '기본 태그는 관리자만 생성할 수 있습니다.'
            }, status=403)
        
        if not name or not color:
            return JsonResponse({
                'success': False,
                'message': '태그명과 색상을 입력해주세요.'
            }, status=400)
        
        # 중복 확인 (기본 태그 + 사용자 태그)
        existing_tag = Tag.objects.filter(
            models.Q(is_default=True, name=name) | 
            models.Q(user=request.user, name=name)
        ).first()
        
        if existing_tag:
            return JsonResponse({
                'success': False,
                'message': '이미 같은 이름의 태그가 존재합니다.'
            }, status=400)
        
        # 새 태그 생성
        tag = Tag.objects.create(
            user=None if is_default else request.user,
            name=name,
            color=color,
            is_default=is_default
        )
        
        return JsonResponse({
            'success': True,
            'message': f'{"기본 " if is_default else ""}태그가 생성되었습니다.',
            'tag': {
                'id': tag.id,
                'name': tag.name,
                'color': tag.color,
                'is_default': tag.is_default
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'태그 생성 중 오류가 발생했습니다: {str(e)}'
        }, status=400)

@login_required
@require_http_methods(["POST"])
def update_tag(request, tag_id):
    """
    태그 수정
    - 일반 사용자: 본인의 사용자 태그만 수정 가능
    - 관리자(superuser): 기본 태그도 수정 가능
    """
    try:
        # 관리자인 경우 모든 태그 수정 가능
        if request.user.is_superuser:
            tag = get_object_or_404(Tag, id=tag_id)
        else:
            # 일반 사용자는 본인의 사용자 태그만 수정 가능
            tag = get_object_or_404(Tag, id=tag_id, user=request.user, is_default=False)
        
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        color = data.get('color', '').strip()
        is_default = data.get('is_default', tag.is_default)
        
        # 일반 사용자는 기본 태그로 변경 불가
        if is_default and not request.user.is_superuser:
            return JsonResponse({
                'success': False,
                'message': '기본 태그는 관리자만 설정할 수 있습니다.'
            }, status=403)
        
        if not name or not color:
            return JsonResponse({
                'success': False,
                'message': '태그명과 색상을 입력해주세요.'
            }, status=400)
        
        # 중복 확인 (자신 제외)
        existing_tag = Tag.objects.filter(
            models.Q(is_default=True, name=name) | 
            models.Q(user=request.user, name=name)
        ).exclude(id=tag.id).first()
        
        if existing_tag:
            return JsonResponse({
                'success': False,
                'message': '이미 같은 이름의 태그가 존재합니다.'
            }, status=400)
        
        # 태그 수정
        tag.name = name
        tag.color = color
        tag.is_default = is_default
        tag.user = None if is_default else request.user
        tag.save()
        
        return JsonResponse({
            'success': True,
            'message': f'{"기본 " if tag.is_default else ""}태그가 수정되었습니다.',
            'tag': {
                'id': tag.id,
                'name': tag.name,
                'color': tag.color,
                'is_default': tag.is_default
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'태그 수정 중 오류가 발생했습니다: {str(e)}'
        }, status=400)

@login_required
@require_http_methods(["POST"])
def delete_tag(request, tag_id):
    """
    태그 삭제 
    - 일반 사용자: 본인의 사용자 태그만 삭제 가능
    - 관리자(superuser): 기본 태그도 삭제 가능 (단, 사용 중이지 않은 경우)
    """
    try:
        # 관리자인 경우 모든 태그에 접근 가능
        if request.user.is_superuser:
            tag = get_object_or_404(Tag, id=tag_id)
        else:
            # 일반 사용자는 본인의 사용자 태그만 삭제 가능
            tag = get_object_or_404(Tag, id=tag_id, user=request.user, is_default=False)
        
        # 기본 태그는 사용 중이면 삭제 불가
        if tag.is_default:
            usage_count = TimeBlock.objects.filter(tag=tag).count()
            if usage_count > 0:
                return JsonResponse({
                    'success': False,
                    'message': f'이 기본 태그는 {usage_count}개의 시간 블록에서 사용 중이어서 삭제할 수 없습니다.'
                }, status=400)
        
        tag_name = tag.name
        is_default = tag.is_default
        tag.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'"{tag_name}" {"기본 " if is_default else ""}태그가 삭제되었습니다.'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'태그 삭제 중 오류가 발생했습니다: {str(e)}'
        }, status=400)

@login_required
def get_tags(request):
    """
    사용자가 사용 가능한 모든 태그 조회 (기본 태그 + 개인 태그)
    """
    try:
        tags = Tag.objects.filter(
            models.Q(is_default=True) | models.Q(user=request.user)
        ).order_by('is_default', 'name')
        
        tag_list = []
        for tag in tags:
            # 관리자는 모든 태그 편집/삭제 가능, 일반 사용자는 본인 태그만
            can_edit = not tag.is_default or request.user.is_superuser
            can_delete = not tag.is_default or request.user.is_superuser
            
            tag_list.append({
                'id': tag.id,
                'name': tag.name,
                'color': tag.color,
                'is_default': tag.is_default,
                'can_edit': can_edit,
                'can_delete': can_delete
            })
        
        return JsonResponse({
            'success': True,
            'tags': tag_list
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'태그 조회 중 오류가 발생했습니다: {str(e)}'
        }, status=400)

@login_required
def debug_tags(request):
    """
    데이터베이스에 저장된 태그 확인용 디버그 뷰
    """
    try:
        all_tags = Tag.objects.all().order_by('created_at')
        
        debug_info = {
            'total_tags': all_tags.count(),
            'tags': []
        }
        
        for tag in all_tags:
            debug_info['tags'].append({
                'id': tag.id,
                'name': tag.name,
                'color': tag.color,
                'is_default': tag.is_default,
                'user': tag.user.username if tag.user else None,
                'created_at': tag.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': tag.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return JsonResponse({
            'success': True,
            'debug_info': debug_info
        }, indent=2)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })
