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
    """
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        color = data.get('color', '').strip()
        
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
            user=request.user,
            name=name,
            color=color,
            is_default=False
        )
        
        return JsonResponse({
            'success': True,
            'message': '태그가 생성되었습니다.',
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
    태그 수정 (사용자 태그만)
    """
    try:
        tag = get_object_or_404(Tag, id=tag_id, user=request.user, is_default=False)
        
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        color = data.get('color', '').strip()
        
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
        tag.save()
        
        return JsonResponse({
            'success': True,
            'message': '태그가 수정되었습니다.',
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
    태그 삭제 (사용자 태그만, 사용 중이지 않은 경우만)
    """
    try:
        tag = get_object_or_404(Tag, id=tag_id, user=request.user, is_default=False)
        
        # 사용 중인 태그인지 확인
        usage_count = TimeBlock.objects.filter(tag=tag).count()
        if usage_count > 0:
            return JsonResponse({
                'success': False,
                'message': f'이 태그는 {usage_count}개의 시간 블록에서 사용 중이어서 삭제할 수 없습니다.'
            }, status=400)
        
        tag_name = tag.name
        tag.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'"{tag_name}" 태그가 삭제되었습니다.'
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
            tag_list.append({
                'id': tag.id,
                'name': tag.name,
                'color': tag.color,
                'is_default': tag.is_default,
                'can_edit': not tag.is_default,  # 기본 태그는 편집 불가
                'can_delete': not tag.is_default  # 기본 태그는 삭제 불가
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
